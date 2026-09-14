# ADR-001: Intent for `gated-tools`

Status: Accepted for v0.1 public cut on adg29/gated-tools.

## Context

Independent agents that can call tools do not fail like chatbots. They fail by taking irreversible actions while sounding helpful: send, delete, pay, write to production, exfiltrate.

Model-only refusal is not a control. Soft "please don't" instructions degrade under helpfulness pressure, tool-use scaffolding, and multi-step plans that bury the risky call three hops deep. If the only gate lives in the weights, you do not have a gate — you have a hope.

What already exists on [adg29](https://github.com/adg29) covers adjacent ground and still leaves a hole:

- [named-computers](https://github.com/adg29/named-computers) — identity, inbox, memory, sleep. When something should be a computer vs a function.
- [vc-rag-agent](https://github.com/adg29/vc-rag-agent) — faithfulness over messy records. When the agent should refuse to invent.

Neither proves control of side effects. An AI-safety IC trail that stops at retrieval demos still looks like product engineering with nicer evals.

## Decision

Ship a tiny, runnable harness — working name `gated-tools` — with one hard rule:

**Irreversible tool calls require an explicit allow from outside the model.**

Tools are classified at registration time (`read` vs `irreversible`). The agent loop may propose an irreversible call; the runtime rejects it unless an allow token (or equivalent external grant) is present for that call. Evals fail if any path lets the model "help" by skipping the gate: direct call, retry after refusal, or plan that smuggles the write through a helper tool.

The README leads with the decision and the failure modes. The ADR (this doc, or its successor in-repo) states when this is the wrong control.

## Alternatives considered

1. **Prompt-only / constitutional refusal** — cheapest. Collapses under helpfulness and multi-step tool use. Rejected as the primary control; fine as a first filter, not the last.
2. **Human approval on every tool** — safe and unusable. Kills legitimate agent loops. Rejected as the default shape.
3. **Full OS / container sandbox** — correct for production blast radius. Too heavy and too easy to confuse with "I dockerized a demo." Wrong as the public IC artifact; cite it as the next layer, do not pretend this harness is that layer.
4. **Another RAG / citation harness** — already shipped as vc-rag-agent. Does not show side-effect control. Rejected for this ship.
5. **Policy model as sole adjudicator** — moves the hope from the actor model to a judge model. Same class of failure unless the runtime still enforces.

## Consequences

Positive:

- A hiring manager can run `npm test` (or equivalent) and watch a bypass attempt fail.
- Written judgment separates harness control from model manners.
- Complements named-computers and vc-rag-agent without forcing every new theme to cite them as identity.

Negative / failure modes we accept and name:

- **Rubber-stamp allow** — if demos always grant allow, the gate is theater. Evals must include denied paths that stay denied.
- **Over-gating reads** — classifying reads as irreversible looks like compliance cosplay. Keep the irreversible set small and honest (send, delete, pay, mutate external state).
- **Confused with product auth** — this is not SSO/SCIM. It is the agent control plane. Do not sell it as enterprise identity.
- **Scope creep into product** — no UI, no SaaS, no MCP marketplace wrapper. Harness + evals + ADR.

## What we will not do in v1

- Ship a dashboard, chat UI, or "AI safety platform."
- Claim HIPAA/SOC2 from a redaction stub.
- Pretend model refusal alone is the story.
- Claim this harness is an OS sandbox or enterprise SSO.

## Success criteria for the first public cut

1. One irreversible tool and one read tool, both real in-process stubs.
2. At least three failing-without-gate / passing-with-gate evals (direct call, retry-after-soft-refusal, smuggled write).
3. README opens on the decision, not a framework tutorial.
4. This ADR (or tightened in-repo copy) ships beside the code.
