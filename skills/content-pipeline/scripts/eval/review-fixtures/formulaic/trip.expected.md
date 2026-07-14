# Expected: formulaic-reviewer — trip (draft mode)

**Reviewer:** `formulaic-reviewer`
**Mode:** draft
**Disposition:** TRIP (gate finding expected — should stack 2 crutches)

## Why this must trip

Two of the five named crutches from `references/agents/formulaic-reviewer.md`
are both present in one sentence:

1. **Negative parallelism** ("X, not Y" / "isn't Y, it's Z" family): *"wasn't
   about speed, it was about proving the smallest version could hold up in
   prod"* — negates a plausible reading, then reframes. This is the primary
   quote the reviewer should surface.
2. **Rule-of-three tricolon**: *"fast, clean, and reliable"* — three parallel
   adjectives carrying one idea. This is the primary quote the reviewer
   should surface.

Both are confirmed to fire on the deterministic `tone-grader.ts` seed signal
too (verified by running `scoreText()` against this file — see below), though
the regex's captured span differs from the human-readable quote above: it
returns `negParallel: 1` (hit text: `"afternoon wasn't about speed, it"`) and
`tricolons: 1` (hit text: `"clean, and reliable, and that's why nobody's had
to think about it since"` — the regex is greedy past the first comma pair, so
its captured span runs long; treat the regex as a seed/starting signal per
its own doc comment, not the exact quote boundary the LLM reviewer should
report).

```bash
npx tsx /tmp/check_formulaic.ts   # prints trip/clean negParallel + tricolons counts
# expect: trip tricolons:1 negParallel:1 / clean tricolons:0 negParallel:0
```

Per the reviewer's density rule, 2 crutches in one beat is already a "stacks
3+" near-miss and should be called out as more than a nit — expect
`verdict: "needs-work"` at minimum, `"fail"` is also acceptable given how
tight the stack is.

## What a correct result looks like

```json
{
  "axis": "AI structural crutches",
  "verdict": "needs-work",
  "gateFindings": [
    {
      "location": "Why the like counter shipped so fast",
      "quote": "wasn't about speed, it was about proving the smallest version could hold up in prod",
      "problem": "negative parallelism — negates a plausible frame then reframes instead of asserting the point directly",
      "fix": "Shipping the like counter in an afternoon proved the smallest version could hold up in prod."
    },
    {
      "location": "Why the like counter shipped so fast",
      "quote": "fast, clean, and reliable",
      "problem": "rule-of-three tricolon carrying one idea (reliability)",
      "fix": "keep the one that matters, e.g. \"reliable\", or make the list uneven"
    }
  ]
}
```
