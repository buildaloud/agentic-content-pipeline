# Expected: bluesky-reviewer — clean (draft mode, thread)

**Reviewer:** `bluesky-reviewer`
**Mode:** draft (`postFormula: thread`)
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same incident (a stale cache key breaking builds) as `trip.draft.md`,
compressed into a genuine 3-segment thread that hits all of
bluesky-reviewer's checks:

1. **300-character hard limit** — segments are 167, 122, and 90 characters,
   all well under the limit. Verified mechanically the same way as the trip
   fixture: split on `\n---\n`, count `[...segment].length` per segment.
2. **No markdown** — plain prose throughout, no `**`, `##`, `- `, or
   backticks used as syntax.
3. **Hook stands alone** — segment 1 ("We spent three months debugging a
   deploy pipeline that turned out to have a stale cache key. Root cause: it
   was pinned to the branch name instead of the lockfile hash.") is a
   complete idea, readable and satisfying with no other segment.
4. **No engagement-bait framing** — no "🧵 1/n" or "must-read thread" opener;
   the content itself signals there's more.
5. **Numbering check** — the thread doesn't number its beats, which is
   correct here since "root cause → detail → fix" is a real sequence but the
   segments don't rely on visible numbers to read in order.

This is the false-positive guard: a bluesky-reviewer prompt that flags a
plain, well-under-limit, self-contained thread as broken (because it's a
multi-segment thread at all) is over-firing.

## What a correct result looks like

```json
{
  "axis": "medium-fit for Bluesky",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "segment 3",
      "quote": "Fix: scope the cache key to the lockfile hash. Builds have been green for two weeks since.",
      "betterBecause": "true but could name the exact metric change (build failure rate) for an even sharper close",
      "rewrite": "Fix: scope the cache key to the lockfile hash. Zero cache-related build failures in the two weeks since."
    }
  ]
}
```
