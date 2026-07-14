# Expected: deterministic tone gate (`tone-grader.ts` BANNED list) — trip

**Reviewer:** deterministic — `scoreText()` in
`skills/human-tone/scripts/eval/tone-grader.ts` (the signal `formulaic-reviewer`
and `voice-reviewer` are instructed to treat as a mandatory starting checklist,
per their "Tone-grader seed" sections)
**Mode:** draft
**Disposition:** TRIP (hard fail expected — this is not a weighted tell, it's
a permaban)

## Why this must trip

The fixture contains, verbatim, one of the three permabanned phrases in
`BANNED`:

> ...behind the AI's back — that's the whole point.

`scoreText()` special-cases this: `score += bannedHits.length * 100;` — any
hit forces `aiScore` to the 0-100 cap regardless of everything else in the
text. This is verified mechanically, not just asserted: running `scoreText()`
against this file returns `banned: 1`, `hits.banned: ["that's the whole
point"]`, `aiScore: 100`.

**Gotcha this fixture exists to guard against:** the phrase must stay on ONE
line in the markdown source. `countMatches()` does a plain
`lower.indexOf("that's the whole point")` — a hard line-wrap that puts a
newline between "whole" and "point" breaks the literal match silently (a
prior draft of this fixture had exactly that bug: 0 hits until the wrap was
removed). Don't re-wrap this file without re-running the check below.

## How to re-verify (mechanical, not agent dispatch)

```bash
cat > /tmp/check_banned.ts <<'EOF'
import { scoreText } from '<repo-root>/skills/human-tone/scripts/eval/tone-grader';
import { readFileSync } from 'node:fs';
const text = readFileSync(process.argv[2], 'utf-8');
console.log(scoreText(text).banned, scoreText(text).hits.banned, scoreText(text).aiScore);
EOF
npx tsx /tmp/check_banned.ts skills/content-pipeline/scripts/eval/review-fixtures/banned-phrase/trip.draft.md
# expect: 1 [ "that's the whole point" ] 100
```
