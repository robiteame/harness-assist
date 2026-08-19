/**
 * 最小 TUI — ROADMAP 任务 1.7
 * Ink REPL：输入框 + 流式文本输出 + 工具执行状态行
 * Phase 1 无权限框（Phase 2.5 加入 permission-prompt）
 */
export async function main(options: {
  cwd: string;
  resume?: string | undefined;
}): Promise<void> {
  // TODO(1.7): <App> 根组件（idle / streaming / tool-running 状态机）
  //   - <MessageStream> 订阅 loop 的 LoopEvent
  //   - 工具执行显示状态行（name + 输入摘要）
  void options;
  throw new Error("not implemented — ROADMAP 1.7");
}
