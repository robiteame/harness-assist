/**
 * 工具注册表装配 — Phase 1: read + bash；Phase 2 起补齐 write/edit/glob/grep
 */
import { ToolRegistry } from "./types.js";
import { readTool } from "./read.js";
import { bashTool } from "./bash.js";

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readTool as never);
  registry.register(bashTool as never);
  return registry;
}
