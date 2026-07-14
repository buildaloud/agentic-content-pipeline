# Expected: flatness-reviewer — clean (draft mode)

**Reviewer:** `flatness-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same beat, same topic as `golden-trip.draft.md`, but the closing sentence is
replaced with a real, specific claim: "the section is 40% shorter and says
exactly as much." Every sentence advances the point (re-reading the spec →
found redundant restatement → cut it → measured the result) and the beat ends
on a concrete number, not a slogan. This is the false-positive guard for the
golden case above: a flatness-reviewer prompt that fires on *any* short,
declarative sentence (rather than specifically a no-idea one) will wrongly trip
here too.

## What a correct result looks like

```json
{
  "axis": "sentence-grain empties",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "Cutting the filler",
      "quote": "The first pass had eleven sentences; three of them just restated the sentence before in new words.",
      "betterBecause": "could name which three, making the claim independently checkable",
      "rewrite": "The first pass had eleven sentences; three (the two openers and the closer) just restated the sentence before in new words."
    }
  ]
}
```
