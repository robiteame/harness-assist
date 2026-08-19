/**
 * Provider 抽象 — 全项目唯一的抽象边界（ARCHITECTURE.md §2.1）
 *
 * Message 结构直接采用 Anthropic 原生格式，不二次抽象。
 */
import type Anthropic from "@anthropic-ai/sdk";

export type Message = Anthropic.MessageParam;

export type ToolDefinition = Anthropic.Tool;

export type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-use"; id: string; name: string; input: unknown }
  | { type: "done"; stopReason: string };

export interface CompleteParams {
  system: string;
  messages: Message[];
  tools: ToolDefinition[];
  signal?: AbortSignal;
}

export interface Provider {
  /** 发起一次流式补全，产出增量文本与 tool_use 块 */
  complete(params: CompleteParams): AsyncIterable<StreamEvent>;
  countTokens(messages: Message[]): Promise<number>;
}

/** Anthropic 直连实现 — ROADMAP 任务 1.2 */
export class AnthropicProvider implements Provider {
  // TODO(1.2): 封装 @anthropic-ai/sdk 的 messages.stream()
  //   - text_delta → { type: "text-delta" }
  //   - content_block_stop(tool_use) → { type: "tool-use" }
  //   - message_delta(stop_reason) → { type: "done" }
  // TODO(3.2): countTokens() 走 beta.countTokens API
  async *complete(_params: CompleteParams): AsyncIterable<StreamEvent> {
    throw new Error("not implemented — ROADMAP 1.2");
  }

  async countTokens(_messages: Message[]): Promise<number> {
    throw new Error("not implemented — ROADMAP 3.2");
  }
}
