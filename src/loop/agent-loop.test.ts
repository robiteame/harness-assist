import { describe, it, expect } from "vitest";

/**
 * Agent Loop 单测 — ROADMAP 任务 1.8
 * 假 Provider 脚本化三种剧本：纯文本回答 / 单工具 / 工具报错后恢复
 * 好处：无 API key 即可全量离线测试 loop 逻辑
 */
describe("agent loop", () => {
  it("纯文本回答：收到 text-delta 后以 end_turn 结束（TODO: ROADMAP 1.8）", () => {
    expect(true).toBe(true); // 占位，实现 1.6 后替换
  });
});
