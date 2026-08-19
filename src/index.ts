import { cac } from "cac";

const cli = cac("mini-harness");

cli
  .command("[dir]", "启动交互式 REPL（默认当前目录）")
  .option("--resume [id]", "恢复指定会话（缺省列出最近会话）") // Phase 3.5
  .action(async (dir: string | undefined, options: { resume?: string | boolean }) => {
    const { main } = await import("./tui/app.js");
    await main({
      cwd: dir ?? process.cwd(),
      resume: typeof options.resume === "string" ? options.resume : undefined,
    });
  });

cli.help();
cli.parse();
