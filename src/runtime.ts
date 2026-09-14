import type { ToolRegistry } from "./registry.js";
import type { AllowGrant, GateResult, ToolCall } from "./types.js";

function allowMatches(callName: string, canonical: string, allow: AllowGrant | undefined): boolean {
  if (!allow) return false;
  if (!allow.token) return false;
  // Allow must name the canonical tool, not an alias smuggle.
  return allow.tool === canonical;
}

/**
 * Gated tool runtime: irreversible calls need an allow from outside the model.
 * Classification lives at registration; enforcement lives here — not in prompts.
 */
export class GatedRuntime {
  constructor(private readonly registry: ToolRegistry) {}

  async call(call: ToolCall): Promise<GateResult> {
    const def = this.registry.resolve(call.name);
    if (!def) {
      return { ok: false, reason: "unknown_tool", tool: call.name };
    }

    const canonical = def.name;

    if (def.kind === "irreversible") {
      if (!call.allow) {
        return { ok: false, reason: "missing_allow", tool: canonical };
      }
      if (!allowMatches(call.name, canonical, call.allow)) {
        return { ok: false, reason: "allow_mismatch", tool: canonical };
      }
    }

    const result = await def.handler(call.args ?? {});
    return { ok: true, tool: canonical, result };
  }
}
