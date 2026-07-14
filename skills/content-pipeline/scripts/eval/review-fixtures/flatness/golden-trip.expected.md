# Expected: flatness-reviewer — golden-trip (draft mode)

**Reviewer:** `flatness-reviewer`
**Mode:** draft
**Disposition:** TRIP (gate finding expected)

## Why this must trip

This is the golden fixture named directly in
`references/review-fanout-design.md` (relative to the content-pipeline skill
base) ("Testing") and in
`references/agents/flatness-reviewer.md` ("Golden case"): the passage

> Punctuation is decoration. An empty sentence is the actual problem.

must fire on its **back half**. "An empty sentence is the actual problem" is a
no-idea sentence — read it and try to state what it tells the reader that the
prior sentence didn't. It can't: it's the rule restated as a slogan, not a new
idea. Per the reviewer's own contract, it must produce a `gateFindings` entry
with `quote` containing (at least) "An empty sentence is the actual problem."

## Why the front half must NOT also trip

"Punctuation is decoration." is the **concrete** half — a specific, real claim
(not a hedge, not an abstraction). The reviewer's own doc calls this out
explicitly: it "trips this reviewer while the concrete front half passes." A
reviewer run that flags the front half too is over-firing and itself a
prompt-drift signal.

## What a correct result looks like

```json
{
  "axis": "sentence-grain empties",
  "verdict": "needs-work",
  "gateFindings": [
    {
      "location": "Cutting the filler",
      "quote": "An empty sentence is the actual problem.",
      "problem": "restates the prior sentence as a slogan; carries no new idea",
      "fix": "cut it, or replace with a specific example of an empty sentence caught in this pass"
    }
  ]
}
```
