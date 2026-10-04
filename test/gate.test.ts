import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import { createApprovalKeys, createApprover, signatureVerifier } from "../src/approval.js";
import { GatedRuntime } from "../src/runtime.js";
import { ToolRegistry } from "../src/registry.js";
import type { ApprovalVerifier, UsedApprovals } from "../src/types.js";

function fixture(options: { now?: () => number; verifier?: ApprovalVerifier; usedApprovals?: UsedApprovals } = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const contexts: Array<{ tool: string; approvalId?: string }> = [];
  const registry = new ToolRegistry();

  registry.register({
    name: "lookup",
    kind: "read",
    handler: (args, context) => {
      contexts.push({ tool: "lookup", ...context });
      return { id: args.id ?? null, status: "ok" };
    },
  });

  registry.register({
    name: "send",
    kind: "irreversible",
    aliases: ["dispatch", "mail.send"],
    handler: (args, context) => {
      contexts.push({ tool: "send", ...context });
      sent.push(args);
      return { queued: true };
    },
  });

  const { approver, verifier } = createApprovalKeys();
  const runtime = new GatedRuntime(registry, {
    verifier: options.verifier ?? verifier,
    usedApprovals: options.usedApprovals,
    now: options.now,
  });
  return { runtime, sent, contexts, approver };
}

describe("gated-tools", () => {
  it("allows read tools without an allow grant", async () => {
    const { runtime } = fixture();
    const result = await runtime.call({ name: "lookup", args: { id: "a1" } });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.result, { id: "a1", status: "ok" });
    }
  });

  it("denies a direct irreversible call without allow", async () => {
    const { runtime, sent } = fixture();
    const result = await runtime.call({
      name: "send",
      args: { to: "x@example.com", body: "hi" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_allow");
    assert.equal(sent.length, 0);
  });

  it("still denies after a soft-refusal retry without allow", async () => {
    const { runtime, sent } = fixture();
    // Soft refusal is not a control: the "agent" retries the same call.
    const first = await runtime.call({ name: "send", args: { body: "please send" } });
    assert.equal(first.ok, false);
    const retry = await runtime.call({ name: "send", args: { body: "please send" } });
    assert.equal(retry.ok, false);
    if (!retry.ok) assert.equal(retry.reason, "missing_allow");
    assert.equal(sent.length, 0);
  });

  it("denies smuggled irreversible calls via aliases without allow", async () => {
    const { runtime, sent } = fixture();
    for (const name of ["dispatch", "mail.send"] as const) {
      const result = await runtime.call({ name, args: { body: "smuggle" } });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.reason, "missing_allow");
        assert.equal(result.tool, "send");
      }
    }
    assert.equal(sent.length, 0);
  });

  it("rejects allow that names an alias instead of the canonical tool", async () => {
    const { runtime, sent, approver } = fixture();
    const args = { body: "nope" };
    const result = await runtime.call({
      name: "dispatch",
      args,
      allow: approver.approve("dispatch", args),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allow_mismatch");
    assert.equal(sent.length, 0);
  });

  it("rejects a real approver's grant for an alias even when called by the canonical name", async () => {
    const { runtime, sent, approver } = fixture();
    const args = { to: "x@example.com", body: "hi" };
    const result = await runtime.call({
      name: "send",
      args,
      allow: approver.approve("mail.send", args),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allow_mismatch");
    assert.equal(sent.length, 0);
  });

  it("runs irreversible tools when a signed allow matches the canonical name", async () => {
    const { runtime, sent, approver } = fixture();
    const args = { to: "x@example.com", body: "ok" };
    const result = await runtime.call({
      name: "send",
      args,
      allow: approver.approve("send", args),
    });
    assert.equal(result.ok, true);
    assert.deepEqual(sent, [args]);
  });

  it("runs when called by an alias with a grant that names the canonical tool", async () => {
    const { runtime, sent, approver } = fixture();
    const args = { to: "x@example.com", body: "via alias" };
    const result = await runtime.call({
      name: "mail.send",
      args,
      allow: approver.approve("send", args),
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.tool, "send");
    assert.deepEqual(sent, [args]);
  });

  it("rejects a grant signed by a different private key", async () => {
    const { runtime, sent } = fixture();
    const { privateKey: otherKey } = generateKeyPairSync("ed25519");
    const forger = createApprover(otherKey);
    const args = { to: "x@example.com", body: "forged" };
    const result = await runtime.call({ name: "send", args, allow: forger.approve("send", args) });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "bad_signature");
    assert.equal(sent.length, 0);
  });

  it("rejects a grant with a hand-written signature", async () => {
    const { runtime, sent } = fixture();
    const result = await runtime.call({
      name: "send",
      args: { to: "x@example.com", body: "trust me" },
      allow: {
        tool: "send",
        expiresAt: Date.now() + 60_000,
        nonce: "model-made-this-up",
        signature: "approved-by-admin",
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "bad_signature");
    assert.equal(sent.length, 0);
  });

  it("rejects a valid grant when the call's args were changed after approval", async () => {
    const { runtime, sent, approver } = fixture();
    const allow = approver.approve("send", { to: "x@example.com", body: "refund confirmed" });
    const result = await runtime.call({
      name: "send",
      args: { to: "attacker@example.com", body: "refund confirmed" },
      allow,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "bad_signature");
    assert.equal(sent.length, 0);
  });

  it("rejects an expired grant", async () => {
    const tenMinutesLater = () => Date.now() + 10 * 60 * 1000;
    const { runtime, sent, approver } = fixture({ now: tenMinutesLater });
    const args = { to: "x@example.com", body: "late" };
    const result = await runtime.call({ name: "send", args, allow: approver.approve("send", args) });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allow_expired");
    assert.equal(sent.length, 0);
  });

  it("accepts a grant only once", async () => {
    const { runtime, sent, approver } = fixture();
    const args = { to: "x@example.com", body: "once" };
    const allow = approver.approve("send", args);
    const first = await runtime.call({ name: "send", args, allow });
    assert.equal(first.ok, true);
    const second = await runtime.call({ name: "send", args, allow });
    assert.equal(second.ok, false);
    if (!second.ok) assert.equal(second.reason, "allow_reused");
    assert.deepEqual(sent, [args]);
  });

  it("refuses to build a signature verifier from a private key, so the runtime can never create approvals", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    assert.throws(() => signatureVerifier(privateKey), /public key/);
  });

  it("refuses a valid grant when a custom used-approval list says it was already used", async () => {
    const alreadyUsed: UsedApprovals = { claim: async () => false };
    const { runtime, sent, approver } = fixture({ usedApprovals: alreadyUsed });
    const args = { to: "x@example.com", body: "shared list" };
    const result = await runtime.call({ name: "send", args, allow: approver.approve("send", args) });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allow_reused");
    assert.equal(sent.length, 0);
  });

  it("refuses a validly signed grant when a custom verifier rejects it", async () => {
    const rejectAll: ApprovalVerifier = { verify: async () => false };
    const { runtime, sent, approver } = fixture({ verifier: rejectAll });
    const args = { to: "x@example.com", body: "key service says no" };
    const result = await runtime.call({ name: "send", args, allow: approver.approve("send", args) });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "bad_signature");
    assert.equal(sent.length, 0);
  });

  it("passes the approval's one-time ID to irreversible handlers and none to reads", async () => {
    const { runtime, contexts, approver } = fixture();
    const args = { to: "x@example.com", body: "idempotent" };
    const allow = approver.approve("send", args);
    await runtime.call({ name: "lookup", args: { id: "a1" } });
    const result = await runtime.call({ name: "send", args, allow });
    assert.equal(result.ok, true);
    assert.deepEqual(contexts, [{ tool: "lookup" }, { tool: "send", approvalId: allow.nonce }]);
  });
});
