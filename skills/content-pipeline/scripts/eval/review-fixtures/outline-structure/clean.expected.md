# Expected: outline-structure-reviewer — clean (outline mode)

**Reviewer:** `outline-structure-reviewer`
**Mode:** outline
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

This is a genuine `war-story` shape (a custom domain silently shadowing an
API route behind an edge route rule), and it matches the
formula's beats in `references/post-formulas.md` (relative to the
content-pipeline skill base) one-to-one:

- **Hook** (order 1) — the specific, reproducible symptom, no diagnosis yet.
- **False lead** (order 2) — a named wrong assumption that cost real time
  ("rewrote the handler twice... same 404 both times"), not a vague "I was
  confused."
- **The reveal** (order 3) — the actual root cause, named plainly (an edge
  route rule shadowing `/api/*`), explicitly flagged in `gateGuidance` as
  the load-bearing beat.
- **The fix** (order 4) — concrete, with a real before/after result.
- **The lesson** (order 5) — one honest takeaway ("a custom domain isn't just
  DNS"), explicitly guided away from a moral-of-the-story bow.

No rule-of-three padding (each beat has a distinct `goal`: hook / turn / turn
/ payoff / context, not three interchangeable proof beats), no tidy-bow
`emotionalCore` (it's "the click of finding an invisible layer," not
reassurance), and the `point` states a real, falsifiable claim rather than a
platitude. This is the false-positive guard: an outline-structure-reviewer
prompt that flags a *correctly*-shaped war-story (because it happens to share
`postFormula: war-story` with the trip case) is over-firing.

## What a correct result looks like

```json
{
  "axis": "whole-outline shape",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "order 2, false lead",
      "quote": "I assumed the function itself was broken and rewrote it twice for nothing",
      "betterBecause": "solid false lead, but naming the specific first fix attempted (not just 'rewrote it') would sharpen the reveal's contrast",
      "rewrite": "I added a manual CORS header and a redundant try/catch, redeployed twice, and got the same 404 both times."
    }
  ]
}
```
