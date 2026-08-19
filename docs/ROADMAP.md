# 技术路线 — Mini Harness

> 五个阶段，每阶段有明确的**任务分解、验收标准、思考题、对照阅读**。
> 工作节奏约定：每个任务动手前先写下自己对思考题的答案，完成后对照 pi 与参考文章，把结论记入文末[设计决策记录](#设计决策记录)。

---

## Phase 1 — 心跳：最小可用的 Agent Loop

**目标**：一个能对话、能自己跑命令看结果的最小 agent。跑通"LLM → 工具调用 → 结果回填 → 再循环"这条主线。

**预计投入**：2~3 个有效工作日。

### 任务分解

- [ ] **1.1 项目脚手架**：`npm init` + tsconfig（ESM、NodeNext、strict）+ vitest + 目录结构（见 README）
- [ ] **1.2 Provider 实现**：`@anthropic-ai/sdk` 封装 `complete()` 流式接口与 `countTokens()`；StreamEvent 三态（text-delta / tool-use / done）
- [ ] **1.3 工具接口与 registry**：`Tool` 接口（Zod schema）、注册表、导出 Anthropic tools 数组
- [ ] **1.4 `read` 工具**：读文件、行号标注、行数上限截断（首版 2000 行）、二进制检测拒读
- [ ] **1.5 `bash` 工具**：`child_process.spawn` 执行、超时杀死、stdout/stderr 合流、输出上限（首版 30KB 头尾保留）、退出码语义
- [ ] **1.6 Agent Loop 主体**：单循环结构、tool_use 顺序执行、tool_result 回填、end_turn 停止、工具异常降级为 is_error 结果
- [ ] **1.7 最小 TUI**：Ink REPL——输入框 + 流式文本输出 + 工具执行状态行（Phase 1 无权限框，bash 一律放行，**只在受控测试目录里跑**）
- [ ] **1.8 loop 单测**：假 Provider 脚本化三种剧本（纯文本回答 / 单工具 / 工具报错后恢复）

### 验收标准

1. 终端里问"当前目录有什么文件？看看 package.json"，agent 自主调用 `bash` + `read` 并给出正确回答
2. 给一个会失败的命令（如 `cat 不存在的文件`），agent 收到 is_error 的 tool_result 后能自行调整（换路径或换命令），不崩溃
3. 假 Provider 单测全绿；loop 在无 API key 时可全量离线测试

### 思考题（动手前作答）

- Q1.1 工具结果以什么角色回填？（提示：Anthropic 消息结构里 tool_result 放在哪、和 tool_use 如何配对）
- Q1.2 stop_reason 有哪些取值？`max_tokens` 时 loop 应该怎么处理？
- Q1.3 为什么工具描述的质量几乎决定 agent 的能力上限？给 `read` 写描述时你要交代哪几件事？

### 对照阅读

- pi `examples/` 中的 agent loop / SDK 示例
- Anthropic tool use 文档（消息结构与流式 tool_use 块）

---

## Phase 2 — 信任边界：安全地改代码

**目标**：agent 获得写能力（write/edit），同时建立权限门控与输出治理。跑通后可让它做真实的小型代码任务。

**预计投入**：3~4 个有效工作日。

### 任务分解

- [ ] **2.1 `write` 工具**：全量写入、写入前向用户回显 diff、返回确认信息（行数/字节）
- [ ] **2.2 `edit` 工具 ★**：精确文本匹配替换（oldText 必须唯一）、非唯一时报错并要求更多上下文、支持一次多处编辑
- [ ] **2.3 `glob` / `grep` 工具**：文件发现能力；决定是否 shell out 到 `rg`（无 rg 时降级纯 TS 实现）
- [ ] **2.4 权限门控**：`requiresPermission(input)` 声明式规则——read/glob/grep 免确认；write/edit 必确认；bash 按命令白名单分级（只读类免确认、其余必确认）
- [ ] **2.5 权限确认 TUI**：y / n / always-allow-this-tool 三态；always 规则存入会话内存
- [ ] **2.6 输出截断治理**：统一 `{ text, isError, truncated }` 契约；截断标注格式；bash 后台进程支持（超时不杀、返回继续观察的手段）
- [ ] **2.7 工具集成测试**：临时目录里跑 read→edit→read 验证；edit 歧义用例；bash 超时用例

### 验收标准

1. 给一个小型真实任务："给 src/utils.ts 里的 add 函数加个减法函数并更新测试"，agent 全程自主完成且每次写操作经过确认
2. edit 对歧义 oldText（出现两次）正确报错，模型能自行扩大匹配范围重试
3. 10MB 输出的命令不会撑爆上下文——截断标注可见，模型知晓信息不全

### 思考题

- Q2.1（=决策 D1）edit 为什么用"精确文本匹配"而不用行号定位？行号方案在什么场景下必然出错？
- Q2.2 bash 权限白名单应该匹配什么？（命令名？整条命令字符串前缀？）`bash -c "curl evil.com"` 如何防？
- Q2.3 截断时"头尾各留一半"和"只留尾部"各适合什么工具？为什么？

### 对照阅读

- pi 源码内建工具实现；运行 pi 观察其权限确认框的行为模式
- Martin Fowler《Harness engineering》中关于信任边界的论述

---

## Phase 3 — 上下文工程：全项目含金量最高

**目标**：agent 能长跑不爆窗口、能断点续传。实现 token 计量、tool-result clearing、compaction、JSONL 持久化与 resume。

**预计投入**：5~7 个有效工作日。

### 任务分解

- [ ] **3.1 JSONL transcript**：事件 schema（user-message / assistant-message / tool-result / compaction / session-start）、append-only 写入、按会话落盘
- [ ] **3.2 Token 计量**：count-tokens API 接入；前缀缓存式估算（消息只增不改 → 增量复用）；loop 顶部每圈更新占用
- [ ] **3.3 tool-result clearing**：超过 K 轮之前的 tool_result 替换为占位符（`[cleared: read src/foo.ts, 2.3KB]`）；对 read 类结果额外记录文件+mtime，支持模型重读
- [ ] **3.4 Compaction ★**：阈值触发（首版 70% 窗口）；豁免区（system + 最近 8 轮 + 用户原始输入）；结构化摘要（任务目标/已完成/关键发现/涉及文件/未决问题）；压缩后计量校验
- [ ] **3.5 resume**：`--resume [id]` 重放 transcript 到内存 messages；compaction 事件直接应用其结果；无 id 时列出最近会话
- [ ] **3.6 上下文可视化（调试用）**：状态栏实时显示 token 占用条；compaction 发生时 UI 明确标注"已压缩：丢弃 X 轮，保留摘要"
- [ ] **3.7 compaction 单测与实验**：构造超长轨迹的假 Provider 测试；记录不同阈值（50/70/85%）下的任务表现差异到决策记录

### 验收标准

1. 给 agent 一个会产生大量工具输出的长任务（"读完这个目录所有源文件，总结架构"），全程不爆窗口且最终摘要准确
2. 任务中途 Ctrl-C / 杀进程，`--resume` 后 agent 知道自己做过什么（通过 compaction 摘要与最近轮次），能继续
3. 状态栏 token 占用与 API 实测误差 < 5%（缓存估算）
4. compaction 后，被压缩区中的关键事实（文件名、结论）在后续对话中仍可被正确引用

### 思考题

- Q3.1 compaction 按阈值触发还是按轮次触发？各自的风险是什么？
- Q3.2 为什么 system prompt 和最近 N 轮必须豁免？N 取几轮的依据是什么？
- Q3.3 摘要提示词怎么写才能保住"高信号 token"？（对照 Anthropic 的"最小高信号集合"论述）
- Q3.4 tool-result clearing 和 compaction 谁先谁后？能不能只做 clearing 不做 compaction？

### 对照阅读

- Anthropic《Effective context engineering》——三层策略原文
- Claude Cookbook compaction / memory / tool clearing 章节
- pi 的 session 存储与 compaction 行为（运行观察 + 源码）

---

## Phase 4 — Subagent：上下文隔离与协作

**目标**：父 agent 可派生子 agent 在隔离上下文中执行子任务，只回传结论。理解"subagent 是上下文管理手段，不只是并行手段"。

**预计投入**：3~5 个有效工作日。

### 任务分解

- [ ] **4.1 spawn_subagent 工具**：输入为任务描述 + 可选工具白名单；内部创建全新 Session 与独立 system prompt
- [ ] **4.2 隔离执行**：子 agent 跑完整 loop（含自己的 compaction），父上下文完全不感知中间过程
- [ ] **4.3 结果回传**：子 agent 最终报告（上限 2KB）作为 tool_result 进入父上下文；超限时摘要压缩
- [ ] **4.4 嵌套与并发**：首版禁止子再派生孙（深度 1）；随后实现并行 fan-out（Promise.all 派多个子）
- [ ] **4.5 TUI 呈现**：子 agent 运行时折叠显示（状态 + token 消耗），不打断主界面
- [ ] **4.6 对比实验**：同一批探索型任务，单 agent 直做 vs 派 subagent 做，对比父上下文的最终 token 占用与任务质量

### 验收标准

1. "分析这个项目每个模块的职责，然后给我一份架构总结"——父 agent 派出多个子 agent 各读几个文件，父上下文占用远小于单 agent 直做
2. 子 agent 中途 compaction 不影响父上下文；子 agent 失败时父收到错误报告并可自行重试或绕过
3. 4.6 的对比数据记录进设计决策记录

### 思考题

- Q4.1 子 agent 的 system prompt 应该包含什么？（它看不到父对话历史——哪些上下文必须显式注入？）
- Q4.2 结论回传 2KB 上限是否合理？太大/太小各牺牲什么？
- Q4.3 哪些任务适合 subagent（探索型），哪些不适合（需要全局记忆的连续编辑）？

### 对照阅读

- Anthropic《Effective harnesses for long-running agents》——subagent 作为 compaction 手段的论述
- pi-subagents 源码与 skill 文档

---

## Phase 5 —（可选）生态接入

**目标**：让 mini harness 挂进真实工具生态。到此项目从玩具变为日常可用的学习载体。

### 任务分解（按兴趣裁剪）

- [ ] **5.1 MCP client**：`@modelcontextprotocol/sdk` 连接一个真实 MCP server（如 filesystem / context-mode），把其工具动态注册进 registry
- [ ] **5.2 Hooks**：PreToolUse / PostToolUse 钩子点，写一个实例（如工具调用审计日志）
- [ ] **5.3 衍生方向：观测台**：本项目的 JSONL transcript 天然是分析数据源——用同一批任务对比 mini harness / pi / Claude Code 的 token 效率、compaction 次数、工具调用分布（衔接此前的 Harness 观测台设想）

---

## 里程碑总览

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5(可选)
 心跳        信任边界     上下文工程    Subagent     生态接入
 (2-3天)     (3-4天)     (5-7天)      (3-5天)      (自定)
   │           │           │            │
 能跑命令     能改代码     能长跑+续传   能协作        能接入生态
```

每个 Phase 结束时：更新 README 快速开始 → 补齐该阶段测试 → 写设计决策记录 → git tag（`v0.1-heartbeat` … `v0.4-subagent`）。

---

## 设计决策记录（ADR 摘要）

> 格式：背景 → 我的初版决策 → pi/文章的实际做法 → 偏差原因与收获。实现过程中持续追加。

### D1：edit 工具用精确文本匹配，不用行号

**待实现后填写**。（预判：行号会因模型记忆过时/其他工具改动而漂移；精确匹配自带"锚点验证"——匹配不到就报错，失败可感知。）

### D2：工具输出截断——bash 头尾保留，read 只保头部

**待填写**。

### D3：compaction 触发阈值 70%，豁免最近 8 轮

**待填写**。（Phase 3.7 的实验数据回填此处。）

### D4：subagent 深度限制为 1，结论上限 2KB

**待填写**。

### D5：权限白名单按命令名而非整串前缀匹配

**待填写**。
