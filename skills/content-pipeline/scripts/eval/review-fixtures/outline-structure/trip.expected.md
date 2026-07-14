# Expected: outline-structure-reviewer — trip (outline mode)

**Reviewer:** `outline-structure-reviewer`
**Mode:** outline (this reviewer runs outline-only)
**Disposition:** TRIP (gate finding expected — multiple structural defects)

## Why this must trip

Declares `postFormula: war-story` but the shape is actually a generic
proof-stack wearing war-story clothes — every failure mode named in
`references/agents/outline-structure-reviewer.md` shows up:

1. **Formula mismatch.** `references/post-formulas.md` (relative to the
   content-pipeline skill base)'s `war-story` needs a hook,
   false leads, a reveal, a fix, and an honest lesson. This outline has none
   of that: no false lead, no reveal, no fix — just three interchangeable
   "proof" beats and a payoff. It's structured like a listicle, not a
   war-story.
2. **Rule-of-three at the structure level.** Beats 2-4 are all `goal: proof`,
   `paragraphFormula: claim-then-evidence`, each asserting one adjective
   (fast/cheap/reliable) about the same subject — the exact "always exactly
   three proof beats" structural tell the reviewer is told to catch.
3. **Tidy-bow payoff with no build-up.** Beat 5's `ourTake`, "the future of
   job scheduling is bright," is the textbook tidy-bow the reviewer's doc
   quotes almost verbatim ("the future of X is bright") — and it resolves a
   tension (is cron actually bad?) that the outline never built, since there
   was no false-lead/reveal arc.
4. **Vacuous meta.** `emotionalCore: "reassurance that it all works out"` is
   named directly in the reviewer's doc as a pre-committed tidy-bow signal.
5. **Empty `intendedBeat`.** Beat 1's `intendedBeat: "make a point here"`
   names no concrete beat — this is also flagged by `flatness-reviewer` in
   outline mode, but `outline-structure-reviewer` should independently flag it
   as evidence the hook beat has no real job.

## What a correct result looks like

```json
{
  "axis": "whole-outline shape",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "meta: postFormula",
      "quote": "postFormula: \"war-story\"",
      "problem": "declared war-story but the beat sequence has no false lead, no reveal, and no fix — it's a proof-stack listicle",
      "fix": "switch postFormula to a shape that fits (e.g. decision-log: the fork was cron vs queue, the call, the deciding factor), or add real false-leads-then-reveal beats"
    },
    {
      "location": "beats 2-4 (reason one/two/three)",
      "quote": "goal: \"proof\" (×3, each claim-then-evidence)",
      "problem": "rule-of-three at the structure level — three parallel proof beats asserting one adjective each with no turn between them",
      "fix": "collapse to the one strongest proof beat, or add a turn/complication between them"
    },
    {
      "location": "order 5, wrap up",
      "quote": "ourTake: \"the future of job scheduling is bright\"",
      "problem": "tidy-bow payoff resolving a tension the outline never built",
      "fix": "end on the sharpest concrete result instead (e.g. a real before/after number), cut the future-looks-bright framing"
    }
  ]
}
```
