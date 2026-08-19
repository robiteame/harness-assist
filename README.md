# Mini Harness — 从零构建一个 Coding Agent

> 一个以**学习 Harness Engineering** 为目的的教学级项目：亲手实现一个能在终端里对话、读写代码、自我管理上下文的 coding agent。
> 不使用任何 agent 框架（LangChain / Vercel AI SDK 等），每一个部件——agent loop、工具系统、context compaction、subagent——全部手写。

## 项目动机

"Agent = Model + Harness。Harness 是模型之外的一切：提示词、工具、上下文管理、执行循环。"

关于 harness engineering 的优质文章越来越多（Addy Osmani、Martin Fowler、OpenAI、Anthropic 都有系统论述），但**读文章无法替代亲手踩坑**：

- "Context 是有限资源"——只有当你的 agent 因工具输出爆炸而窗口溢出时，这句话才有实感
- "Compaction 要保留高信号 token"——只有你自己写压缩策略、看它丢错信息导致任务失败时，才理解取舍在哪
- "Subagent 用上下文隔离换取并行"——只有自己实现父/子上下文交接时，才明白哪些信息必须带回

本项目按"心跳 → 信任边界 → 上下文工程 → 多 agent → 生态接入"五阶段递进，每阶段产出一个**可运行、可验证**的 agent。

## 学习方法：对照 pi 源码

本机安装的开源 harness **pi**（`@earendil-works/pi-coding-agent`）是绝佳的对照参考——一个生产级实现：

```
~/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/
├── README.md            # 主文档
├── docs/                # extensions.md / skills.md / sdk.md / models.md ...
└── examples/            # extensions / custom tools / SDK 集成示例（含 agent loop 示例）
```

**约定的工作方式**：每实现一个模块前，先写下自己的设计答案 → 实现 → 阅读 pi 对应实现 → 在本文档的[设计决策记录](docs/ROADMAP.md#设计决策记录)中记录差异和收获。

## 技术栈

| 决策点 | 选择 | 理由 |
|---|---|---|
| 语言/运行时 | TypeScript 5.x + Node 22+（ESM） | 与 pi / Claude Code 同栈，源码对照零翻译成本 |
| LLM SDK | `@anthropic-ai/sdk`（直连） | 流式 + tool use 的原生 message loop 正是学习对象，不能再被包一层 |
| 终端 UI | Ink（React for terminal） | Claude Code 同款方案，流式渲染/工具卡片/权限确认框 |
| CLI 解析 | cac | 比 commander 轻，几个子命令足够 |
| 工具 Schema | Zod + zod-to-json-schema | 一份定义同时管运行时校验和模型侧 schema |
| 会话持久化 | JSONL 追加式 transcript | 天然适合审计、回放、resume、离线分析 |
| Token 计量 | Anthropic count-tokens API（免费） | compaction 触发判断的依据，不猜不估 |
| 测试 | vitest | loop 用假 transport 单测；工具用临时目录集成测试 |
| 包管理 | npm | 环境已有，不引入额外变量 |

**显式不用的东西**：LangChain、LlamaIndex、Vercel AI SDK、Mastra 等任何 agent 框架；任何嵌入式向量数据库（本项目不做 RAG）。

## 总体架构

```
┌─────────────────────────────────────────────────┐
│  TUI 层            │ 流式渲染 / 工具调用卡片 /      │
│                    │ 权限确认框 / 状态栏            │
├─────────────────────────────────────────────────┤
│  Agent Loop ★      │ while(true):                 │
│                    │   LLM → tool_calls → 执行     │
│                    │   → 回填 → 循环 / 停止         │
├──────────────┬──────────────┬────────────────────┤
│  工具系统 ★   │  上下文管理 ★ │  Provider 抽象      │
│  registry    │  token 计量   │  薄接口，未来可       │
│  read/write/ │  输出截断     │  接 OpenAI 兼容端点   │
│  edit/bash/  │  compaction  │                    │
│  glob/grep   │  持久化/resume│                    │
├──────────────┴──────────────┴────────────────────┤
│  Subagent 层（Phase 4）│ 隔离上下文 / 结果回传       │
├─────────────────────────────────────────────────┤
│  MCP Client + Hooks（Phase 5）│ 真实生态接入       │
└─────────────────────────────────────────────────┘
```

带 ★ 的三块是 harness 的心脏，也是学习价值最高的部分。详细设计见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 阶段路线（摘要）

| 阶段 | 主题 | 核心产出 | 详细分解 |
|---|---|---|---|
| Phase 1 | 心跳 | 能对话、能自己跑命令看结果的最小 agent | [ROADMAP](docs/ROADMAP.md#phase-1--心跳最小可用的-agent-loop) |
| Phase 2 | 信任边界 | 能安全修改代码的 agent（edit/权限/截断） | [ROADMAP](docs/ROADMAP.md#phase-2--信任边界安全地改代码) |
| Phase 3 | 上下文工程 | 长跑不爆窗口 + 断点续传（compaction/resume） | [ROADMAP](docs/ROADMAP.md#phase-3--上下文工程全项目含金量最高) |
| Phase 4 | Subagent | 多 agent 协作，隔离上下文 + 结论回传 | [ROADMAP](docs/ROADMAP.md#phase-4--subagent上下文隔离与协作) |
| Phase 5 | 生态接入 | MCP client / hooks，挂进真实工具生态 | [ROADMAP](docs/ROADMAP.md#phase-5--可选生态接入) |

## 目录规划

```
harness-assist/
├── README.md                 # 本文件
├── docs/
│   ├── ARCHITECTURE.md       # 架构与模块详细设计
│   ├── ROADMAP.md            # 阶段任务分解 + 设计决策记录
│   └── RESOURCES.md          # 精读语料清单与笔记
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # CLI 入口（cac 子命令）
    ├── loop/
    │   └── agent-loop.ts     # ★ 核心 agent loop
    ├── tools/
    │   ├── registry.ts       # 工具注册与 schema 导出
    │   ├── read.ts / write.ts / edit.ts
    │   ├── bash.ts           # 超时 + 输出截断
    │   ├── glob.ts / grep.ts
    │   └── types.ts          # Tool 接口定义
    ├── context/
    │   ├── token-meter.ts    # count-tokens 计量
    │   ├── truncation.ts     # 工具输出截断策略
    │   └── compaction.ts     # ★ 压缩摘要
    ├── session/
    │   ├── transcript.ts     # JSONL 读写
    │   └── resume.ts         # 会话恢复
    ├── providers/
    │   └── anthropic.ts      # 薄 Provider 抽象
    ├── tui/
    │   ├── app.tsx           # Ink 根组件
    │   ├── message-stream.tsx
    │   └── tool-card.tsx / permission-prompt.tsx
    └── subagents/            # Phase 4
        └── supervisor.ts
```

## 快速开始（Phase 1 完成后可用）

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev            # 进入交互式 REPL
npm run dev -- resume  # 恢复上一次会话（Phase 3）
```

## 文档索引

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 架构设计与模块详细设计
- [docs/ROADMAP.md](docs/ROADMAP.md) — 五阶段任务分解、验收标准、设计决策记录
- [docs/RESOURCES.md](docs/RESOURCES.md) — 精读语料清单

## 参考资料（核心）

- Addy Osmani — [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)
- Martin Fowler — [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html)
- LangChain — [The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness)
- OpenAI — [Harness engineering](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Anthropic — [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- Claude Cookbook — [Context engineering: memory, compaction, and tool clearing](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)
