# Roadmap: from demo to production

This repo shows one idea: an irreversible tool call runs only with an approval that came from outside the model. The code is small on purpose. This page lists what it would take to run the idea in a real system, and which parts belong in this repo versus your own setup.

Each item starts with the failure it prevents, because that's how you decide whether you need it yet.

## In this repo

These are small, keep the runtime simple, and make the production pieces possible without changing it.

### 1. Signed approvals

**Prevents:** the model, or any code that can build a tool call, approving itself.

Whoever can say yes holds a private key and signs each approval. The runtime holds only the public key. Each approval covers the tool's real name, its exact arguments, an expiry time, and a one-time ID. ([PR #3](https://github.com/adg29/gated-tools/pull/3))

### 2. Swappable parts

**Prevents:** having to fork the runtime the day you need a key service or a database.

The runtime takes two small plug-ins:

- `ApprovalVerifier` checks whether an approval is genuine. The default checks an Ed25519 signature. You could swap in a cloud key service.
- `UsedApprovals` remembers which approvals were already used. The default keeps them in memory. In production you'd back it with a shared database.

Also in [PR #3](https://github.com/adg29/gated-tools/pull/3).

### 3. A one-time ID passed to the tool

**Prevents:** an email going out twice after a crash and retry.

The handler for an irreversible tool receives the approval's one-time ID as `approvalId`. Pass it to the email or payment provider as its duplicate-protection key (most call it an idempotency key). If your process dies after sending but before recording the result, the retry is recognized as a repeat and dropped. Also in [PR #3](https://github.com/adg29/gated-tools/pull/3).

### 4. Not yet: key IDs on approvals

**Prevents:** every outstanding approval breaking when you switch to a new key.

Approvals would name which key signed them, and the verifier would accept a short list of current keys. Worth adding once anyone actually needs to change keys.

### 5. Not yet: a standard argument format

**Prevents:** valid approvals failing when the approver and the runtime are written in different languages.

Both sides must turn the arguments into exactly the same bytes before signing. Today that's a small function in `src/approval.ts`. If a Python approver needs to sign for a TypeScript runtime, switch to the published standard for this, [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).

## In your system

These depend on your infrastructure, so this repo describes them instead of building them.

### 6. Put the gate in front of the real tools

**Prevents:** code in the agent's process skipping the gate and calling the email function directly.

In this repo the gate, the tools, and the agent share one process. That's fine for showing the idea, but any code in that process could call the email handler directly. In production, the tools and their real credentials live in a separate service. The agent can only reach that service through the gate. This is the same "keep the control outside the thing that can be talked into harm" idea as [ADR-002](ADR-002-brain-hands-and-gates.md), applied to tools.

```
agent  →  gate service (checks approval)  →  email provider
                ↑
     approver service (holds signing key)
```

### 7. Keep the signing key in a key service

**Prevents:** a leaked key letting anyone approve anything.

The private key should never sit in the agent's process or its environment variables. Keep it in a cloud key service (AWS KMS, Google Cloud KMS, or similar) that signs on request, and lock down who can ask it to sign.

### 8. Share the used-approval list

**Prevents:** the same approval working once per copy of your app.

If you run several copies or restart often, the in-memory list isn't enough. Back `UsedApprovals` with a database, and make the "mark as used" step a single action that fails if the ID already exists (a unique-key insert in Postgres, `SET NX` in Redis). Checking first and then writing leaves a gap where two copies can both succeed.

### 9. Show exactly what's being approved

**Prevents:** a person approving something different from what runs.

The approval screen must show the exact recipient, amount, or message that will be signed, not a summary written by the model. When someone says no, the agent should get a clear "denied" result so it can tell the user, rather than retrying or failing silently.

### 10. Approve low-risk actions automatically

**Prevents:** people clicking "approve" on everything because there are too many requests.

A policy service can hold its own signing key and approve small, low-risk actions itself, like refunds under $50 to an existing customer. People then review only what matters. This keeps the gate meaningful: when every request needs a person, people stop reading them.

### 11. Keep an audit log the agent can't edit

**Prevents:** not being able to answer "who approved this, and what exactly ran?"

Record every request, approval, refusal, and completed action in an append-only store outside the agent's reach. Include the approval's one-time ID so you can connect each action to the approval that allowed it.

## Order to do it in

If you're taking this to production, roughly:

1. Merge items 1 to 3 (PR #3).
2. Move the tools behind a gate service (item 6). Without this, the rest can be bypassed.
3. Move the key into a key service (item 7) and share the used-approval list (item 8).
4. Build the approval screen (item 9) and the audit log (item 11).
5. Add automatic approval for low-risk actions (item 10) once you see which requests people approve without thinking.
