# Expected: voice-reviewer — clean (draft mode)

**Reviewer:** `voice-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same topic as `trip.draft.md` (a queue decision), same length, but hits all
three of voice-reviewer's checks:

1. **Burstiness** — "I killed the queue." (4 words) slams against a 21-word
   sentence next, then a 17-word close. Real length variation.
2. **Concrete specifics** — "Four hours in", "the CDN's own retry
   behavior", "$30 a month", "the rate-limit store" — named tool, real number, real cost.
3. **Flat held opinion** — "I killed the queue" is a stated action, not a
   hedge; "we never needed one" is a flat claim, not "arguably" or "it's worth
   noting."

This is the false-positive guard: a voice-reviewer prompt that flags short,
declarative, first-person prose (because it's terse) rather than specifically
flat/voiceless prose is over-firing.

## What a correct result looks like

```json
{
  "axis": "voice fidelity + human texture",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "Improving the queue",
      "quote": "the CDN's own retry behavior handles it better than anything I'd hand-roll.",
      "betterBecause": "true but could name the specific retry mechanism for an even sharper claim",
      "rewrite": "The CDN's built-in exponential backoff on its edge functions handles it better than anything I'd hand-roll."
    }
  ]
}
```
