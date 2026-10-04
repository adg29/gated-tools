# ADR-002: Sandboxing and tool approvals are separate layers

Status: Accepted. Builds on [ADR-001](ADR-001-gated-tools-intent.md). Documentation only; no new code.

## Context

Once people hear "agent safety," the next question is usually: *why not just put the agent in a sandbox?*

A common, well-described architecture for secure agents splits the system into two parts (see Katelyn Lesse, [Secure agents: architecture and sandboxing](https://x.com/katelyn_lesse/status/2099315903884415400)):

- **The brain** is trusted infrastructure you run: the agent loop, conversation state, credentials, logs, and a kill switch.
- **The hands** are a sandbox where untrusted things happen: running generated code, installing packages, browsing. The sandbox never holds real credentials. Outbound requests go through a proxy that adds secrets on the way out, and the kill switch lives outside the box.

That design answers the question *"what can untrusted code reach?"* It doesn't answer *"which actions may the agent take on its own?"*

An example of the gap: your support agent's brain has a `send_email` tool connected to your real mail provider. The sandbox is airtight and no generated code can reach the network. A customer writes, "please just email me the refund confirmation," and the model calls `send_email` from the brain, outside the sandbox. The sandbox never saw it. Nothing stopped it.

The reverse gap is real too. Add tool approvals but skip the sandbox, and generated code running next to your credentials can call the mail provider directly, never touching your tool layer.

## Decision

1. Treat these as two layers that stack, and document both in [architecture-layers.md](architecture-layers.md):
   - **Layer A, sandbox (brain/hands):** keeps untrusted code away from secrets and the kill switch.
   - **Layer B, tool approvals (this repo):** keeps irreversible tools from running without an approval from outside the model, even on trusted infrastructure.
2. This repo implements Layer B only.
3. Don't add sandbox, credential vault, egress proxy, or kill-switch code here. Those are real systems that deserve their own projects, and a toy version would suggest protection this repo doesn't give.

## Alternatives considered

1. **Leave the sandbox out of the docs.** Rejected. Readers will reasonably ask how this relates, and without an answer they may assume one replaces the other.
2. **Build a small sandbox in this repo.** Rejected. A demo container isn't a security boundary, and it would bury the one idea this repo exists to show.
3. **Describe approvals as "a kind of sandbox."** Rejected. They fail differently. Sandboxes fail when code escapes or reaches a secret. Approvals fail when an action runs without permission. One label for both hides which check you're missing.

## Consequences

Good: readers get a clear answer to "why not just sandbox it?", plus a picture of where this piece fits in a full system.

Cost: some readers will look for sandbox code here and not find it. The architecture note says plainly that this repo covers Layer B only.
