# 架构设计 — Mini Harness

> 本文档描述目标架构与各模块详细设计。随阶段演进而更新；每阶段实现完成后，在模块小节末尾追加"实现后记"记录与设计的偏差。

## 1. 设计原则

1. **手写一切核心部件**：agent loop、工具执行、上下文管理不用框架。允许使用的"轮子"仅限基础设施类：SDK 传输、Ink 渲染、Zod 校验。
2. **每个部件可独立测试**：loop 依赖 Provider 接口（可注入假 transport），工具是纯函数式的 execute(request) → result，不与 UI 耦合。
3. **transcript 是唯一事实源**：所有消息进出都落 JSONL。UI 是 transcript 的投影，resume = 重放 transcript，离线分析 = 读 transcript。
4. **渐进式复杂度**：Phase 1 的代码结构必须能自然演化到 Phase 4，禁止预埋大量空抽象（YAGNI）。

## 2. 模块详细设计

### 2.1 Provider 抽象（src/providers/）

全项目唯一的抽象边界，刻意保持极薄：

```ts
interface Provider {
  /** 发起一次流式补全，产出增量文本与 tool_use 块 */
  complete(params: {
    system: string;
    messages: Message[];        // Anthropic 原生消息结构，不二次抽象
    tools: ToolDefinition[];    // JSON Schema
    signal?: AbortSignal;
  }): AsyncIterable<StreamEvent>;
  countTokens(messages: Message[]): Promise<number>;
}
```

要点：

- **Message 结构直接采用 Anthropic 原生格式**（role/content blocks）。harness 的复杂度本来就藏在消息结构里，再包一层只会藏掉学习对象。
- StreamEvent 三种：`text-delta` / `tool-use` / `done(with stop_reason)`。
- 未来的 OpenAI 兼容端点在本层适配，loop 层零改动。

### 2.2 Agent Loop（src/loop/agent-loop.ts）★

```
初始化: system prompt + 历史消息(或空) + 工具注册表
loop:
  1. provider.complete(messages) 流式产出
     ├─ 文本增量 → 实时推送 UI
     └─ 结束 → 得到 assistant 消息（含 0..n 个 tool_use 块）
  2. 停止条件判断:
     stop_reason == "end_turn"          → 结束本轮，等待用户输入
     stop_reason == "tool_use"          → 进入工具执行
     stop_reason == "max_tokens"        → 错误处理路径（截断恢复）
  3. 顺序执行每个 tool_use:
     a. 权限检查（Phase 2）→ 可能弹确认框
     b. registry.execute(name, input)
     c. 工具输出 → 截断策略（Phase 2）→ 封装为 tool_result
  4. 将 [assistant消息, ...tool_results] 追加进 messages
  5. 回到 1
```

设计要点：

- **单循环，无递归**：工具结果回填后回到循环顶部，不嵌套调用。
- **错误即结果**：工具执行失败（异常、超时、非零退出码）不中断循环，而是作为 `is_error: true` 的 tool_result 回填，让模型自己决定重试还是换路。这是 harness 与传统代码最大的思维差异之一。
- **每圈计量**（Phase 3 起）：循环顶部查询 token 占用，驱动 compaction。
- **可中断**：用户 Ctrl-C 通过 AbortSignal 传导到 provider 请求；已产生的半截 assistant 消息按"已发生事实"落盘。

### 2.3 工具系统（src/tools/）★

```ts
interface Tool<TInput> {
  name: string;
  description: string;          // 给模型看的说明，质量直接影响调用质量
  schema: ZodType<TInput>;      // 运行时校验 + 导出 JSON Schema
  requiresPermission(input: TInput): PermissionRequest | null;
  execute(input: TInput, ctx: ToolContext): Promise<ToolOutput>;
}

interface ToolContext {
  cwd: string;                  // 沙箱根目录
  signal: AbortSignal;
  // Phase 3 起: readFile() 走缓存，使 token 计量可复用
}
```

工具清单与关键设计：

| 工具 | 关键设计问题 |
|---|---|
| `read` | 截断上限（行数 vs 字节）；是否带行号；二进制文件如何拒读 |
| `write` | 覆盖 vs 追加语义；写入前是否回显 diff |
| `edit` ★ | **精确文本匹配替换**而非行号 diff（为什么？见 ROADMAP 决策 D1） |
| `bash` | 超时（默认 30s，后台任务续命）；输出截断（头尾保留）；退出码语义 |
| `glob` / `grep` | 是否直接依赖系统 `rg`；结果条数上限 |

**输出统一契约**：所有工具返回 `{ text, isError, truncated }`，截断发生时在文本头部标注 `...output truncated, showed last N of M bytes...`，让模型知道信息不全、可主动再读。

### 2.4 上下文管理（src/context/）★

三个机制按引入顺序：

**Token 计量（token-meter）**
- 每次 loop 顶部调 count-tokens API（免费、同步）。
- 缓存策略：消息列表末尾只增不改，可按前缀增量估算，误差控制在阈值的安全余量内。

**工具输出截断（truncation）**
- 分层：先截断单次工具输出（bash 上限 ~30KB、read 上限 ~50 行），compaction 时再做二次清除（tool-result clearing：把老轮次的 tool_result 替换为 `[cleared: read src/foo.ts, 2KB]` 占位符）。
- 这对应 Anthropic Cookbook 的三层策略：compaction / tool-result clearing / memory。

**Compaction（compaction）★**
- 触发：token 占用 > 阈值（建议 70% 窗口；Phase 3 首版用固定值，Phase 3.4 实验不同阈值）。
- 豁免区：system prompt、最近 N 轮（N=8 起步）、所有 user 的原始输入。
- 压缩区：其余轮次 → 单独一次 LLM 调用生成结构化摘要（任务目标 / 已完成 / 关键发现 / 涉及文件 / 未决问题）→ 替换为一条 `compact summary` 消息。
- 写入 transcript：compaction 事件本身落盘（保留原文在归档文件），resume 时重放压缩后的轨迹。

### 2.5 会话持久化（src/session/）

- **JSONL，一行一事件**。事件类型：`user-message` / `assistant-message` / `tool-result` / `compaction` / `session-start`。
- 每行含递增序号与会话 ID；写入用 append-only，永不改写已落盘行。
- `resume`：读 JSONL → 重放到内存 messages（compaction 事件直接应用其结果）→ 继续对话。
- 目录：`~/.mini-harness/sessions/<date>-<id>.jsonl`。

### 2.6 TUI（src/tui/）

- Ink 根组件 `App`，内部状态机：`idle / streaming / awaiting-tool-permission / tool-running`。
- 流式文本：`<MessageStream>` 订阅 loop 的事件总线。
- 工具卡片：执行前显示意图（name + 摘要输入），执行后折叠为结果摘要；结果全文可按键展开——**UI 只展示摘要，全文在 transcript 里**，这本身就是一种 context 纪律。
- 权限确认框：`y / n / always-allow-this-tool` 三态。

### 2.7 Subagent 层（src/subagents/，Phase 4）

- 父 agent 通过内置 `spawn_subagent` 工具派生子 agent。
- 子 agent：全新 Session + 受限工具集 + 独立 system prompt（由父 agent 的任务描述实例化）。
- **上下文隔离**：子 agent 的完整轨迹不进入父上下文，只有最终 `final report`（上限 ~2KB）作为 tool_result 回传。
- 先做同步阻塞式（父等待子），再考虑并行 fan-out。

## 3. 数据流示例（一次典型交互）

```
用户: "看看这个项目用了哪些依赖，把过期的列出来"
  │
  ▼
[transcript 追加 user-message]
[loop 1] LLM → tool_use: bash("cat package.json")
  ├─ 权限: bash 读取类 → 自动放行
  ├─ 执行 → 截断 → tool_result(文本)
  └─ [transcript 追加 assistant-message + tool-result]
[loop 2] LLM → tool_use: bash("npm outdated --json")
  ├─ 权限: 网络类命令 → 弹确认框 → 用户放行
  └─ ...
[loop 3] LLM → end_turn + 文本回答
  ├─ [transcript 追加 assistant-message]
  └─ UI 渲染最终回答，回到 idle
```

## 4. 测试策略

| 层 | 方式 | 要点 |
|---|---|---|
| loop | 假 Provider（脚本化 StreamEvent 序列） | 验证：多工具顺序执行、工具错误回填、end_turn 停止、abort 中断 |
| tools | 临时目录 + 真实文件系统 | 验证：edit 唯一性匹配失败、bash 超时、截断标注 |
| compaction | 假 Provider + 构造超长轨迹 | 验证：豁免区保留、摘要替换、计量缓存命中 |
| 端到端 | 录制/回放真实 API 响应（HTTP mock 层） | 冒烟：给定任务 → 断言工具调用序列 |

## 5. 与 pi 的对照阅读地图

| 本项目模块 | pi 参考位置 |
|---|---|
| agent loop | `examples/` 下 SDK agent loop 示例；README 的 SDK 章节 |
| 工具协议（read/edit/bash 语义） | 源码内建工具实现 + `docs/extensions.md`（自定义工具章节） |
| 权限门控 | 运行 pi 观察其确认框行为；`docs/environment-variables.md` |
| subagent | `pi-subagents` skill（`~/.pi/agent/npm/node_modules/pi-subagents/`） |
| 会话/持久化 | 运行 pi 后查看其 session 存储的落盘格式 |
