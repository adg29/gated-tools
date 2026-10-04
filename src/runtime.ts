import type { KeyObject } from "node:crypto";
import { verifyGrant } from "./approval.js";
import type { ToolRegistry } from "./registry.js";
import type { GateResult, ToolCall } from "./types.js";

export type GatedRuntimeOptions = {
  /** The approver's public key: enough to check approvals, never to create them. */
  approverKey: KeyObject;
  now?: () => number;
};

/**
 * Gated tool runtime: irreversible calls need a signed approval from outside the model.
 * Classification lives at registration; enforcement lives here, not in prompts.
 */
export class GatedRuntime {
  private readonly approverKey: KeyObject;
  private readonly now: () => number;
  private readonly usedNonces = new Map<string, number>();

  constructor(
    private readonly registry: ToolRegistry,
    options: GatedRuntimeOptions,
  ) {
    // A private key would also verify, but then the runtime could mint approvals itself.
    if (options.approverKey.type !== "public") {
      throw new Error("approverKey must be a public key");
    }
    this.approverKey = options.approverKey;
    this.now = options.now ?? Date.now;
  }

  async call(call: ToolCall): Promise<GateResult> {
    const def = this.registry.resolve(call.name);
    if (!def) {
      return { ok: false, reason: "unknown_tool", tool: call.name };
    }

    const canonical = def.name;
    const args = call.args ?? {};

    if (def.kind === "irreversible") {
      const now = this.now();
      this.forgetExpiredNonces(now);

      const allow = call.allow;
      if (!allow) {
        return { ok: false, reason: "missing_allow", tool: canonical };
      }
      // Allow must name the canonical tool, not an alias smuggle.
      if (allow.tool !== canonical) {
        return { ok: false, reason: "allow_mismatch", tool: canonical };
      }
      if (!verifyGrant(this.approverKey, allow, canonical, args)) {
        return { ok: false, reason: "bad_signature", tool: canonical };
      }
      if (now >= allow.expiresAt) {
        return { ok: false, reason: "allow_expired", tool: canonical };
      }
      if (this.usedNonces.has(allow.nonce)) {
        return { ok: false, reason: "allow_reused", tool: canonical };
      }
      // Recorded before the handler awaits, so a concurrent call with the same grant is refused.
      this.usedNonces.set(allow.nonce, allow.expiresAt);
    }

    const result = await def.handler(args);
    return { ok: true, tool: canonical, result };
  }

  // Safe to forget: an expired grant is refused by the expiry check before reuse is consulted.
  private forgetExpiredNonces(now: number): void {
    for (const [nonce, expiresAt] of this.usedNonces) {
      if (now >= expiresAt) this.usedNonces.delete(nonce);
    }
  }
}
