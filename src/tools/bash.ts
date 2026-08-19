/**
 * bash 工具 — ROADMAP 任务 1.5
 * child_process.spawn 执行、超时杀死、输出合并、30KB 头尾截断、退出码语义
 */
import { z } from "zod";
import { type Tool, error } from "./types.js";

export const bashTool: Tool<{ command: string; timeout?: number | undefined }> = {
  name: "bash",
  // TODO(1.5): 交代 cwd、超时默认 30s、截断语义、退出码语义
  description: "Execute a bash command in the project directory. (TODO: ROADMAP 1.5)",
  schema: z.object({
    command: z.string().describe("The command to execute"),
    timeout: z.number().optional().describe("Timeout in seconds (default 30)"),
  }),
  requiresPermission() {
    // Phase 1 无权限框，一律放行 — 只在受控测试目录里跑！Phase 2.4 起实现白名单分级
    return null;
  },
  async execute(input, ctx) {
    // TODO(1.5): spawn / 超时 AbortSignal 联动 / 输出截断
    void input;
    void ctx;
    return error("not implemented — ROADMAP 1.5");
  },
};
