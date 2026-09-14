# Lightning talk outline: Model manners are not a control plane

~8 minutes. Six slides. Not a deck marathon.

## 1. Title
- **Model manners are not a control plane**
- `gated-tools` — a tiny harness for irreversible agent actions
- Alan Garcia / adg29

## 2. The failure mode that actually matters
- Chatbots fail by saying the wrong thing.
- Tool-using agents fail by **doing** the wrong thing while sounding helpful: send, delete, pay, write prod.
- Soft "please don't" in the prompt is hope under helpfulness pressure and multi-step plans.

## 3. Adjacent proof ≠ this proof
- Identity / memory: named computers vs functions.
- Faithfulness: grounded Q&A that refuses to invent.
- Still missing: **who authorizes a side effect?** That is the safety-IC gap on most portfolios.

## 4. The rule
- Classify tools at registration: `read` vs `irreversible`.
- Irreversible calls need an **explicit allow from outside the model**.
- The runtime enforces it. The weights do not get a vote on bypass.

## 5. What the evals catch
- Direct irreversible call without allow → denied.
- Retry after soft refusal, still no allow → denied.
- Alias / smuggled name without canonical allow → denied.
- Read tools work; granted irreversible calls work.
- Demo: `npm test`.

## 6. What this is not (and when the gate is wrong)
- Not SSO, not HIPAA theater, not an OS sandbox, not a chat UI.
- Failure modes: rubber-stamp allows; over-gating reads; selling this as product auth.
- Next layer in production is real isolation — this cut proves the **control claim**, not the blast-radius ceiling.

## Optional closer (if you have 30s)
- Staff-shaped public work: one sharp cut a hiring manager can run and disagree with.
- Trail: profile → gated-tools → ADR.
