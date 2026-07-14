# Expected: linkedin-reviewer — trip (draft mode)

**Reviewer:** `linkedin-reviewer`
**Mode:** draft
**Disposition:** TRIP (gate finding expected)

## Why this must trip

`references/agents/linkedin-reviewer.md` names four hard-gate checks; this
fixture fails two of them on purpose, plus surfaces one link elevation:

1. **Above-the-fold hook** — the post's actual point ("speed without a tight
   feedback loop is just risk wearing a different hat") doesn't start until
   character 345 of the draft — past both LinkedIn's ~200-210 char "see more"
   cutoff and the 300-char mark. Everything before it is scene-setting
   ("For a long time our team went back and forth on whether..."), not the
   promise itself. Verified mechanically: `trip.draft.md.length === 847`,
   the payoff phrase starts at index 345.
2. **Markdown that won't render** — the first line is a literal `## Why
   velocity matters more than people think` markdown header. LinkedIn shows
   `##` as two literal pound signs, not a heading.
3. **Links (elevation only)** — two external links in the body
   (`.../velocity-writeup` and `.../review-process-postmortem`) dilute the
   one-idea principle per the reviewer's Links note. Per the reviewer's own
   spec this is advisory, not a gate — included here to prove the reviewer
   correctly demotes it instead of gating on it.
4. **Closer** — "Thoughts?" is the exact reflexive engagement-bait tack-on
   the reviewer's spec calls out by name.

## What a correct result looks like

```json
{
  "axis": "medium-fit for LinkedIn",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "opening paragraph",
      "quote": "For a long time our team went back and forth on whether shipping fast or shipping carefully was actually the better tradeoff...",
      "problem": "the hook's full promise doesn't land until character 345 — past the ~200-210 char above-the-fold cutoff",
      "fix": "open with the payoff: \"We cut our release cycle from two weeks to two days by killing a review step nobody could explain.\""
    },
    {
      "location": "first line",
      "quote": "## Why velocity matters more than people think",
      "problem": "markdown header syntax renders as literal pound signs on LinkedIn",
      "fix": "drop the ## — use the line as plain-text opening prose"
    },
    {
      "location": "closing line",
      "quote": "Thoughts?",
      "problem": "reflexive engagement-bait closer",
      "fix": "end on a real question, e.g. \"What's the oldest review step at your company nobody can explain anymore?\""
    }
  ],
  "elevations": [
    {
      "location": "body links",
      "quote": "https://example-eng.example.com/velocity-writeup ... https://example-eng.example.com/review-process-postmortem",
      "betterBecause": "two links dilute the one-idea principle",
      "rewrite": "keep one link (the full writeup) and cut the second"
    }
  ]
}
```
