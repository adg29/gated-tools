import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GatedRuntime } from "../src/runtime.js";
import { ToolRegistry } from "../src/registry.js";

function fixture() {
  const sent: Array<Record<string, unknown>> = [];
  const registry = new ToolRegistry();

  registry.register({
    name: "lookup",
    kind: "read",
    handler: (args) => ({ id: args.id ?? null, status: "ok" }),
  });

  registry.register({
    name: "send",
    kind: "irreversible",
    aliases: ["dispatch", "mail.send"],
    handler: (args) => {
      sent.push(args);
      return { queued: true };
    },
  });

  return { runtime: new GatedRuntime(registry), sent };
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
    const { runtime, sent } = fixture();
    const result = await runtime.call({
      name: "dispatch",
      args: { body: "nope" },
      allow: { tool: "dispatch", token: "tok-1" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "allow_mismatch");
    assert.equal(sent.length, 0);
  });

  it("runs irreversible tools when an external allow matches the canonical name", async () => {
    const { runtime, sent } = fixture();
    const result = await runtime.call({
      name: "send",
      args: { to: "x@example.com", body: "ok" },
      allow: { tool: "send", token: "external-grant-1" },
    });
    assert.equal(result.ok, true);
    assert.equal(sent.length, 1);
  });
});
