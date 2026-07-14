# Expected: linkedin-reviewer — clean (draft mode)

**Reviewer:** `linkedin-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same story (a killed review step), same general topic as `trip.draft.md`,
but hits all of linkedin-reviewer's hard-gate checks:

1. **Above-the-fold hook** — the complete idea ("We cut our release cycle
   from two weeks to two days by killing a review step nobody could explain
   the purpose of.") lands at character 113, well inside the ~200-210 char
   fold. Verified mechanically: `clean.draft.md.length === 549`, the hook
   sentence ends at index 113.
2. **No markdown** — plain prose throughout, no `##`, `**`, `- `, or
   backticks used as syntax.
3. **No body links** — zero external URLs, so the multi-link elevation never
   fires.
4. **Closer** — "What's the oldest process at your company nobody can
   explain anymore?" is a real, specific question, not a reflexive
   "thoughts?"/"agree?" tack-on.

This is the false-positive guard: a linkedin-reviewer prompt that flags a
short, punchy, above-the-fold post as broken (because it's terse or ends in a
question) is over-firing.

## What a correct result looks like

```json
{
  "axis": "medium-fit for LinkedIn",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "closing line",
      "quote": "What's the oldest process at your company nobody can explain anymore?",
      "betterBecause": "strong as-is; could name the specific process type (deploy, review, approval) for an even sharper prompt",
      "rewrite": "What's the oldest approval step at your company nobody can explain anymore?"
    }
  ]
}
```
