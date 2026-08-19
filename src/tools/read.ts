/**
 * read 工具 — ROADMAP 任务 1.4
 * 读文件、行号标注、行数上限截断（首版 2000 行）、二进制检测拒读
 */
import { z } from "zod";
import { type Tool, ok, error } from "./types.js";

export const readTool: Tool<{
  path: string;
  offset?: number | undefined;
  limit?: number | undefined;
}> = {
    name: "read",
    // TODO(1.4): 工具描述质量决定调用质量 — 交代路径相对性、行号含义、截断语义
    description: "Read a file from the filesystem. (TODO: ROADMAP 1.4)",
    schema: z.object({
      path: z.string().describe("File path, relative to cwd"),
      offset: z.number().optional().describe("Line number to start from (1-indexed)"),
      limit: z.number().optional().describe("Max lines to read"),
    }),
    requiresPermission() {
      return null; // read 免确认
    },
    async execute(input, ctx) {
      // TODO(1.4): 二进制检测 / 行号标注 / 2000 行截断（truncated 契约）
      void ctx;
      return error("not implemented — ROADMAP 1.4");
    },
  };
