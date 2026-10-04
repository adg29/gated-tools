import type { ToolRegistry } from "./registry.js";
import type { ApprovalVerifier, GateResult, ToolCall, UsedApprovals } from "./types.js";
import { memoryUsedApprovals } from "./used-approvals.js";

export type GatedRuntimeOptions = {
  /** Checks approvals but must not be able to create them (e.g. signatureVerifier with a public key). */
  verifier: ApprovalVerifier;
  /** Defaults to an in-memory list; share one across processes in production. */
  usedApprovals?: UsedApprovals;
  now?: () => number;
};

/**
 * Gated tool runtime: irreversible calls need a signed approval from outside the model.
 * Classification lives at registration; enforcement lives here, not in prompts.
 */
export class GatedRuntime {
  private readonly verifier: ApprovalVerifier;
  private readonly usedApprovals: UsedApprovals;
  private readonly now: () => number;

  constructor(
    private readonly registry: ToolRegistry,
    options: GatedRuntimeOptions,
  ) {
    this.verifier = options.verifier;
    this.now = options.now ?? Date.now;
    this.usedApprovals = options.usedApprovals ?? memoryUsedApprovals({ now: this.now });
  }

  async call(call: ToolCall): Promise<GateResult> {
    const def = this.registry.resolve(call.name);
    if (!def) {
      return { ok: false, reason: "unknown_tool", tool: call.name };
    }

    const canonical = def.name;
    const args = call.args ?? {};

    if (def.kind === "read") {
      const result = await def.handler(args, {});
      return { ok: true, tool: canonical, result };
    }

    const allow = call.allow;
    if (!allow) {
      return { ok: false, reason: "missing_allow", tool: canonical };
    }
    // Allow must name the canonical tool, not an alias smuggle.
    if (allow.tool !== canonical) {
      return { ok: false, reason: "allow_mismatch", tool: canonical };
    }
    if (!(await this.verifier.verify(allow, canonical, args))) {
      return { ok: false, reason: "bad_signature", tool: canonical };
    }
    if (this.now() >= allow.expiresAt) {
      return { ok: false, reason: "allow_expired", tool: canonical };
    }
    // Claimed last so a refused call doesn't use up the approval, and before the handler so a concurrent call with it is refused.
    if (!(await this.usedApprovals.claim(allow.nonce, allow.expiresAt))) {
      return { ok: false, reason: "allow_reused", tool: canonical };
    }

    const result = await def.handler(args, { approvalId: allow.nonce });
    return { ok: true, tool: canonical, result };
  }
}
