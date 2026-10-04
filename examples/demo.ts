// Plays out the README story: a support agent tries to email a customer
// without approval, then through a shortcut name, then with approval.
// No model or API key needed; the agent's tool calls are scripted.
import { GatedRuntime, ToolRegistry, type GateResult, type ToolCall } from "../src/index.js";

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

const runtime = new GatedRuntime(registry);
const email = { to: "dana@example.com", body: "Your refund is confirmed." };

function show(call: ToolCall, result: GateResult, note = ""): void {
  const reasons = {
    missing_allow: "no approval",
    allow_mismatch: "approval is for a different name",
    unknown_tool: "no such tool",
  };
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
  { name: "mail.send", args: email, allow: { tool: "mail.send", token: "approval-for-shortcut" } },
  "  (approval written for the shortcut)",
);

console.log(`\n  Emails sent so far: ${outbox.length}`);
console.log(`\nSupport lead clicks "Approve" in the review queue.\n`);

await step({ name: "send_email", args: email, allow: { tool: "send_email", token: "approval-123" } });

console.log(`\n  Emails sent: ${outbox.length}\n`);
