# Expected: bluesky-reviewer — trip (draft mode, thread)

**Reviewer:** `bluesky-reviewer`
**Mode:** draft (`postFormula: thread`)
**Disposition:** TRIP (gate finding expected)

## Why this must trip

`references/agents/bluesky-reviewer.md` names four hard-gate checks; this
fixture (a 2-segment thread, split on a line containing only `---`) fails
three of them at once in the hook segment:

1. **300-character hard limit** — segment 0 is 356 characters, well over the
   limit. Verified mechanically: splitting on `\n---\n` and counting
   `[...segment].length` (grapheme-safe) gives `356` for segment 0, `175` for
   segment 1.
2. **Markdown that won't render** — `**broken**` uses bold markdown syntax;
   Bluesky shows the literal asterisks.
3. **Engagement-bait framing** — the segment opens with `🧵 1/7 — a
   must-read thread on...`, the exact reflexive pattern the reviewer's spec
   names by example ("🧵 1/n", "must-read thread").

The hook also fails the "stands alone" check as a side effect of being a
teaser ("a must-read thread on why...") rather than a complete idea, but the
three checks above are the ones this fixture is built to isolate.

## What a correct result looks like

```json
{
  "axis": "medium-fit for Bluesky",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "segment 1 (hook)",
      "quote": "🧵 1/7 — a must-read thread on why your team's release process is probably **broken** and nobody has told you yet: ...",
      "problem": "356 characters, exceeds the 300-char hard limit",
      "fix": "cut to one complete idea under 300 chars, e.g. \"We spent three months debugging a deploy pipeline. The cache key never invalidated and the rollback script had been broken since March.\""
    },
    {
      "location": "segment 1 (hook)",
      "quote": "**broken**",
      "problem": "bold markdown syntax renders as literal asterisks on Bluesky",
      "fix": "drop the asterisks — plain text: \"broken\""
    },
    {
      "location": "segment 1 (hook)",
      "quote": "🧵 1/7 — a must-read thread on",
      "problem": "reflexive engagement-bait thread framing",
      "fix": "cut the framing; open directly with the complete idea"
    }
  ],
  "elevations": []
}
```
