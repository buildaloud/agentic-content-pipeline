# Expected: formulaic-reviewer — clean (draft mode)

**Reviewer:** `formulaic-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same topic and beat as `trip.draft.md`, rewritten to state the point directly
with real numbers instead of scaffolding: no negate-then-reframe ("wasn't
about X, it was about Y"), no tricolon list, no tidy-bow closer, no
"in conclusion" signposting, no hedge phrase. "One managed-database table, one edge
function, no queue" and "three weeks without a single 500" are concrete
specifics doing the work a crutch would otherwise paper over. This is the
false-positive guard: a formulaic-reviewer prompt that flags plain, confident,
specific prose (because it mentions the same topic as the trip case) is
over-firing.

## What a correct result looks like

```json
{
  "axis": "AI structural crutches",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "Why the like counter shipped so fast",
      "quote": "mostly because there was nothing left in it to break",
      "betterBecause": "true and sharp, but could name the one thing that WAS still a risk",
      "rewrite": "mostly because there was nothing left in it to break except the managed database's connection limit, which we're not close to yet"
    }
  ]
}
```
