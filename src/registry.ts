import type { ToolDefinition } from "./types.js";

export class ToolRegistry {
  private byName = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    const names = [tool.name, ...(tool.aliases ?? [])];
    for (const name of names) {
      if (this.byName.has(name)) {
        throw new Error(`tool name already registered: ${name}`);
      }
      this.byName.set(name, tool);
    }
  }

  resolve(name: string): ToolDefinition | undefined {
    return this.byName.get(name);
  }

  /** Canonical name for allow matching (aliases resolve to definition.name). */
  canonicalName(name: string): string | undefined {
    return this.byName.get(name)?.name;
  }
}
