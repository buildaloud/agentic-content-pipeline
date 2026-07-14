# Expected: deterministic tone gate (`tone-grader.ts` BANNED list) — clean

**Reviewer:** deterministic — `scoreText()` in
`skills/human-tone/scripts/eval/tone-grader.ts`
**Mode:** draft
**Disposition:** CLEAN (no banned-phrase hit expected)

## Why this must stay clean

Same beat, same claim as `trip.draft.md`, with the banned phrase replaced by a
real reason ("I wanted the audit trail untouchable, so I cut write access
entirely instead of gating it") instead of the hollow "that's the whole
point" tic. Verified mechanically: running `scoreText()` against this file
returns `banned: 0`, `hits.banned: []`. `aiScore` (7 as of writing) is
non-zero only from ordinary weighted signals (e.g. the em-dash), never from
the 100-point banned-phrase penalty — this is the false-positive guard for
the trip case above.

## How to re-verify

```bash
npx tsx /tmp/check_banned.ts skills/content-pipeline/scripts/eval/review-fixtures/banned-phrase/clean.draft.md
# expect: 0 [] <some low number>
```
