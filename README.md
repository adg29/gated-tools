# gated-tools

Irreversible tool calls need an **explicit allow from outside the model**.

A prompt that says "don't send email" is not a control plane. Soft refusal dies under helpfulness pressure and multi-step tool plans. If the only gate lives in the weights, you have a hope — not a gate.

This repo is a tiny harness and evals that fail when you collapse those two. No chat UI. No "AI safety platform." Judgment first.

## Decision

1. Classify tools at registration: `read` vs `irreversible`.
2. The agent may *propose* an irreversible call.
3. The runtime rejects it unless an allow grant from outside the model is present for the **canonical** tool name.
4. Evals must catch direct calls, retries after soft refusal, and alias smuggling.

When this is the wrong control: see [docs/ADR-001-gated-tools-intent.md](docs/ADR-001-gated-tools-intent.md).

## Run the evals

```bash
npm install
npm test
```

They fail if:

- an irreversible tool runs without an allow
- a retry after soft refusal still runs without an allow
- an alias (`dispatch`, `mail.send`) bypasses a gate that only checked the pretty name
- an allow that names the alias (not the canonical tool) is accepted

## Failure modes we name on purpose

- **Rubber-stamp allow** — demos that always grant make the gate theater.
- **Over-gating reads** — compliance cosplay. Keep the irreversible set small.
- **Confused with SSO** — this is the agent control plane, not enterprise identity.
- **Scope creep** — no dashboard, no SaaS wrapper.

## Docs

- [ADR-001: Intent](docs/ADR-001-gated-tools-intent.md)
- [Memo: why an AI-safety IC trail](docs/memo-ai-safety-ic-trail.md)
- [Lightning talk outline](docs/lightning-talk.md) (six slides)

## Adjacent (optional)

- [named-computers](https://github.com/adg29/named-computers) — identity, inbox, memory, sleep.
- [vc-rag-agent](https://github.com/adg29/vc-rag-agent) — faithfulness over messy records.

Neither replaces side-effect control. That is this repo.

## Related reading

- [Katelyn Lesse on secure agent architecture](https://x.com/katelyn_lesse/status/2099315903884415400) — sandbox / credentials / egress kill switch: control plane outside the thing that can be talked into harm. Same conviction, lower layer than tool-class allows. Complementary, not a duplicate of this harness.

## License

MIT
