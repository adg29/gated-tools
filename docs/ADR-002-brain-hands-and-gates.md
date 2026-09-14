# ADR-002: Brain/hands vs tool-class allows

Status: Accepted (docs maturity). Complements ADR-001. Does not expand v1 code scope into a sandbox product.

## Context

ADR-001 locked the v1 claim: irreversible tool calls need an explicit allow outside the model.

Alan asked to mature the repo with the **brain / hands** architecture POV (sandbox, credentials outside the box, egress injection, external kill switch) — the pattern spelled out in Katelyn Lesse’s [Secure agents: architecture and sandboxing](https://x.com/katelyn_lesse/status/2099315903884415400).

Risk: either ignore that layer (trail looks thin) or rebuild Anthropic’s platform in this repo (scope explosion, junior “I dockerized it” signal).

## Decision

1. Document brain/hands as **Layer A** in [architecture-layers.md](architecture-layers.md): complementary, structural, not implemented here.
2. Keep `gated-tools` runtime as **Layer B** only: tool-class allows on the trusted harness.
3. Cite Lesse as related reading with an explicit “same conviction, different layer” line — not a duplicate claim.
4. Do **not** add sandbox, vault, egress proxy, or kill-switch code in this repository for v1/v1.1 docs maturity.

## Alternatives considered

1. **Ignore architecture** — leave README at tool allows only. Rejected: hiring managers reading security-agent writing will ask where the box sits; we should show we know the stack.
2. **Implement a mini-sandbox in-repo** — tempting demo. Rejected: wrong artifact; becomes product theater; ADR-001 already rejected OS sandbox as the public IC cut.
3. **Merge layers into one metaphor** — “allow = sandbox.” Rejected: muddies failure modes (injection+creds vs helpful irreversible tool use).

## Consequences

Positive: the trail shows stack judgment; lightning talk and memo can point at two layers without a manifesto.

Negative: readers may ask “where’s the sandbox code?” — answer in the architecture note: elsewhere; this repo proves the allow gate.

## Relationship to ADR-001

ADR-001 remains the code decision. ADR-002 is the stacking decision: what we document vs what we implement.
