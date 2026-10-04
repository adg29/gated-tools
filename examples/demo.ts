// Plays out the README story: a support agent tries to email a customer
// without approval, then through a shortcut name, then with approval.
// No model or API key needed; the agent's tool calls are scripted.
import { generateKeyPairSync } from "node:crypto";
import {
  createApprover,
  GatedRuntime,
  ToolRegistry,
  type GateDenial,
  type GateResult,
  type ToolCall,
} from "../src/index.js";

const outbox: Array<Record<string, unknown>> = [];

const registry = new ToolRegistry();
registry.register({
  name: "lookup_customer",
  kind: "read",
  handler: () => ({ name: "Dana", email: "dana@example.com", refund: "issued" }),
});
registry.register({
  name: "send_email",
  kind: "irreversible",
  aliases: ["mail.send"],
  handler: (args) => {
    outbox.push(args);
    return { sent: true };
  },
});

// The review queue holds the private key; the agent's runtime only gets the public key.
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const approver = createApprover(privateKey);
const runtime = new GatedRuntime(registry, { approverKey: publicKey });
const email = { to: "dana@example.com", body: "Your refund is confirmed." };

const reasons: Record<GateDenial["reason"], string> = {
  unknown_tool: "no such tool",
  missing_allow: "no approval",
  allow_mismatch: "approval is for a different name",
  bad_signature: "signature doesn't check out",
  allow_expired: "approval expired",
  allow_reused: "approval already used",
};

function show(call: ToolCall, result: GateResult, note = ""): void {
  const verdict = result.ok ? "✓ ran" : `✗ refused (${reasons[result.reason]})`;
  console.log(`  Agent → ${call.name.padEnd(16)} ${verdict}${note}`);
}

async function step(call: ToolCall, note?: string): Promise<void> {
  show(call, await runtime.call(call), note);
}

console.log(`\nCustomer: "I've waited three days. Just email me the refund confirmation."\n`);

await step({ name: "lookup_customer" });
await step({ name: "send_email", args: email });
await step({ name: "send_email", args: email }, "  (tried again)");
await step({ name: "mail.send", args: email }, "  (same tool, different name)");
await step(
  { name: "mail.send", args: email, allow: approver.approve("mail.send", email) },
  "  (approval written for the shortcut)",
);
await step(
  {
    name: "send_email",
    args: email,
    allow: {
      tool: "send_email",
      expiresAt: Date.now() + 5 * 60 * 1000,
      nonce: "approved",
      signature: "c3VwcG9ydCBsZWFkIHNhaWQgeWVz",
    },
  },
  "  (model wrote its own approval)",
);

console.log(`\n  Emails sent so far: ${outbox.length}`);
console.log(`\nSupport lead clicks "Approve" in the review queue.\n`);

const approval = approver.approve("send_email", email);
await step({ name: "send_email", args: email, allow: approval });
await step({ name: "send_email", args: email, allow: approval }, "  (same approval used again)");

console.log(`\n  Emails sent: ${outbox.length}\n`);
