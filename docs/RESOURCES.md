# 精读语料清单 — Mini Harness

> 按阶段组织。建议节奏：动手某 Phase 前 1 小时通读对应文献，实现完成后带着问题重读一遍。

## 总论：什么是 Harness

| 文章 | 何时读 | 关注点 |
|---|---|---|
| [Agent Harness Engineering — Addy Osmani](https://addyosmani.com/blog/agent-harness-engineering/) | Phase 1 前 | 全景认知：harness = 模型之外的一切；harness engineering 把脚手架当正式工程产物对待 |
| [The Anatomy of an Agent Harness — LangChain](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) | Phase 1 前 | 部件分解视角，与本项目架构图对照 |
| [Harness engineering — OpenAI](https://openai.com/index/harness-engineering/) | Phase 1 前 | 工程组织视角：agent-first 团队的分工如何变化 |
| [Harness engineering for coding agent users — Martin Fowler](https://martinfowler.com/articles/harness-engineering.html) | Phase 2 前 | 使用者视角的信任模型，对权限设计有直接启发 |
| [Building Effective Agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents) | Phase 1 前 | "简单可组合模式优于复杂框架"——本项目不用框架的理论依据 |

## 上下文工程（Phase 3 核心语料）

| 文章 | 何时读 | 关注点 |
|---|---|---|
| [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Phase 3 前必读 | "最小高信号 token 集合"论述；context 是有限资源；compaction / structured note-taking / subagent 三手段 |
| [Context engineering cookbook — Claude Platform](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools) | Phase 3 中 | compaction / tool-result clearing / memory 三种策略的实操代码，与本项目 3.3/3.4 直接对应 |
| [Effective harnesses for long-running agents — Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | Phase 3 完成后 | 长跑 agent 的 session 切换、memory 文件；对照自己的 resume 实现找差距 |
| [Harness design for long-running application development — Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps) | Phase 4 前 | planner/generator/evaluator 三 agent 架构；结构化工件交接上下文 |

## 官方协议与 API 文档

- Anthropic Messages API（流式 + tool use 消息结构）—— Phase 1 的枕边书
- Anthropic count-tokens API —— Phase 3
- MCP 规范（modelcontextprotocol.io）—— Phase 5

## 本机对照源码

| 对象 | 位置 | 用途 |
|---|---|---|
| pi 主程序 | `~/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/` | 生产级 harness 全量源码 |
| pi 文档 | 同上 `docs/`（extensions / skills / sdk / models …） | 工具协议、扩展机制的权威说明 |
| pi 示例 | 同上 `examples/` | SDK 级 agent loop 参考实现 |
| pi-subagents | `~/.pi/agent/npm/node_modules/pi-subagents/` | Phase 4 subagent 实现对照 |

## 阅读笔记区

> 每篇读完后在此追加三行以内的高浓度笔记：一个最颠覆认知的点 + 一个可应用到本项目的点。

- （待填写）
