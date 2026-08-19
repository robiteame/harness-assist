/**
 * 工具系统接口与注册表（ARCHITECTURE.md §2.3）
 */
import type { ZodType } from "zod";
import type { ToolDefinition } from "../providers/anthropic.js";

export interface ToolOutput {
  text: string;
  isError: boolean;
  truncated: boolean;
}

export interface ToolContext {
  cwd: string;
  signal: AbortSignal;
}

export interface PermissionRequest {
  tool: string;
  reason: string;
  /** 展示给用户的输入摘要 */
  summary: string;
}

export interface Tool<TInput = unknown> {
  name: string;
  /** 给模型看的说明 — 质量直接影响调用质量（思考题 Q1.3） */
  description: string;
  schema: ZodType<TInput>;
  /** Phase 2.4：声明式权限规则；null 表示免确认 */
  requiresPermission(input: TInput): PermissionRequest | null;
  execute(input: TInput, ctx: ToolContext): Promise<ToolOutput>;
}

/** 统一输出契约构造器 */
export function ok(text: string, truncated = false): ToolOutput {
  return { text, isError: false, truncated };
}

export function error(text: string): ToolOutput {
  return { text, isError: true, truncated: false };
}

export class ToolRegistry {
  private tools = new Map<string, Tool<never>>();

  register(tool: Tool<never>): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool<never> | undefined {
    return this.tools.get(name);
  }

  /** 导出为 Anthropic tools 数组（zod → JSON Schema） */
  toAnthropicTools(): ToolDefinition[] {
    // TODO(1.3): zod-to-json-schema 转换
    throw new Error("not implemented — ROADMAP 1.3");
  }

  async execute(
    name: string,
    input: unknown,
    ctx: ToolContext,
  ): Promise<ToolOutput> {
    const tool = this.tools.get(name);
    if (!tool) {
      return error(`Unknown tool: ${name}`);
    }
    const parsed = tool.schema.safeParse(input);
    if (!parsed.success) {
      return error(`Invalid input for ${name}: ${parsed.error.message}`);
    }
    return tool.execute(parsed.data, ctx);
  }
}
