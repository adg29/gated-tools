# Memo: Why an AI-safety IC public trail is worth pursuing

Audience: Alan. Purpose: lock conviction before we cut `gated-tools`. Not a manifesto. Not a job-search plan.

## Claim

AI safety hiring will keep expanding past research-only seats into builder seats: people who can run agents in the wild, specify failure modes, and put controls outside the model. The scarce public signal is not "I read the papers." It is "I already operate agents as an IC, and my GitHub shows judgment about what must not be left to the model."

A short public trail on adg29 that a hiring manager can follow in three minutes — harness they can run, ADR they can disagree with, failure modes named — is that signal. It is worth doing even if no single posting asks for it by name.

## Why now (evidence, not vibes)

1. **Independent agent operation is rare and visible.** Most portfolios still show chat UIs, fine-tunes, or RAG notebooks. Few show a control plane for tool side effects with tests that fail when the agent is "helpful." That gap is the opportunity.

2. **Model-only refusal is not a control.** Soft refusals degrade under tool-use scaffolding and multi-step plans. Industry practice is moving toward permissions, dual control, and runtime gates. A public artifact that encodes that judgment matches how serious teams actually ship agents — and how safety orgs evaluate builders who will own production risk.

3. **adg29 already has adjacent proof, not this proof.** Profile README correctly points at named-computers (identity vs function) and vc-rag-agent (faithfulness). Pins still show tutorial / visionOS forks, which undercuts the first screen. Neither shipped repo answers: what happens when the agent can mutate the world? The hole is side-effect control, not another retrieval demo.

4. **Staff-shaped work beats checklist theater.** Suraj-style "build these 12 FDE projects" lists reward volume. Safety IC signal rewards one sharp cut: decision, harness, evals that catch the expensive miss. Same bar we already use for staff GitHub — systems others can run, written judgment, not toy apps.

5. **The thesis is about proof artifacts, not applications.** Remote Jobs owns roles. This trail exists so when those roles surge, the artifacts are already public and honest. We do not shape the repo for one logo.

## What "worthwhile" means here

Worthwhile if:

- A skeptical IC can clone, run tests, and see a bypass die without reading a pitch.
- The ADR states when this gate is the wrong tool (and points at sandboxes / product auth as different layers).
- The trail stays three links deep: profile → gated-tools → ADR (with named-computers / vc-rag as optional siblings, not mandatory citations).

Not worthwhile if:

- We ship twelve half-repos to look busy.
- We rename RAG as "safety" without a new control claim.
- We wait to perfect older themes before cutting this one.

## Conviction (one paragraph)

I am convinced the next wave of AI safety builder hiring will overweight people who have already treated agents as systems with blast radius — not as demos. Putting `gated-tools` on adg29 is a small, runnable bet on that: harness-level allow for irreversible tools, evals against helpful bypasses, ADR that model manners are not the control plane. If the bet is wrong, we learned cheaply. If it is right, the trail exists before the surge, which is the whole point of independent IC work done in public.

## Open go/no-go

Pins cleanup on the profile is a separate UI click. Memo + ADR + harness + lightning outline are one first ship, not a roadmap.
