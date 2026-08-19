/**
 * Agent Loop — 全项目心脏（ARCHITECTURE.md §2.2）
 *
 *   1. provider.complete(messages) 流式产出
 *   2. 停止条件: end_turn → 结束本轮 | tool_use → 执行工具 | max_tokens → 错误路径
 *   3. 顺序执行每个 tool_use → 截断 → tool_result
 *   4. 追加进 messages，回到 1
 *
 * 关键语义：
 *   - 单循环，无递归
 *   - 错误即结果：工具失败不中断循环，作为 is_error 的 tool_result 回填
 *   - 可中断：AbortSignal 传导到 provider 请求
 */
import type { Message, Provider } from "../providers/anthropic.js";
import type { ToolRegistry } from "../tools/types.js";

export interface AgentLoopOptions {
  provider: Provider;
  registry: ToolRegistry;
  system: string;
  cwd: string;
  signal?: AbortSignal;
  /** 流式事件回调（UI 订阅） */
  onEvent?: (event: LoopEvent) => void;
}

export type LoopEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-start"; name: string; input: unknown }
  | { type: "tool-result"; name: string; isError: boolean; truncated: boolean }
  | { type: "turn-end"; stopReason: string };

export async function runTurn(
  options: AgentLoopOptions,
  messages: Message[],
): Promise<Message[]> {
  // TODO(1.6): 实现单轮 agent loop
  //   - 流式转发 text-delta 到 onEvent
  //   - tool_use 块顺序执行（registry.execute）
  //   - 错误/截断按 is_error / truncated 契约回填
  //   - Phase 3 起：loop 顶部每圈做 token 计量，驱动 compaction
  throw new Error("not implemented — ROADMAP 1.6");
}
