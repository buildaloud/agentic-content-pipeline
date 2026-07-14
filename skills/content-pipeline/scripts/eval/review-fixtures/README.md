# Review fixtures

Diffable behavior anchors for the document-review-fanout army
(`references/review-fanout-design.md`, relative to the content-pipeline skill
base). Each fixture pairs
a **trip** case (should produce a `gateFindings` entry) with a **clean** case
(should not — this is the false-positive guard). These exist because the
ship-gate for that spec found no fixtures had shipped: without them, a
reviewer-prompt edit can silently stop catching (or start over-firing on)
the exact thing it was written for, and nothing would notice.

Real content throughout, no lorem ipsum — most fixtures are adapted from
genuine incident write-ups (a CDN custom-domain routing bug, a
plugin's link-map drift, a fast-shipped feature that held up in prod) so the
fixtures double as regression anchors for real defect patterns, not
synthetic examples.

## Layout

```
review-fixtures/
  index.json               ← master list: reviewer, axis, mode, file paths
  <reviewer>/
    trip.draft.md           (or golden-trip.draft.md / trip.outline.md)
    trip.expected.md         — why it must trip + the expected finding shape
    clean.draft.md          (or clean.outline.md)
    clean.expected.md         — why it must stay clean
```

`index.json` is the terse index (one entry per fixture pair, pointing at the
files); the `.expected.md` files are the detail — read the index first, open
the `.expected.md` for the fixture you care about.

## Coverage

| id | reviewer | mode | gate |
|---|---|---|---|
| `flatness-golden` | `flatness-reviewer` | draft | yes |
| `formulaic` | `formulaic-reviewer` | draft | yes |
| `voice` | `voice-reviewer` | draft | yes |
| `banned-phrase` | deterministic tone gate (`tone-grader.ts`) | draft | yes |
| `outline-structure` | `outline-structure-reviewer` | outline | yes |
| `link-integrity` | `link-integrity-reviewer` | draft | yes |
| `linkedin` | `linkedin-reviewer` | draft | yes |
| `email` | `email-reviewer` | draft | yes |
| `bluesky` | `bluesky-reviewer` | draft | yes |

All nine are **gate**-disposition per the design doc's reviewer table — these
are the ones whose `gateFindings` block the fixpoint loop, so a false negative
here means a real defect ships, and a false positive means the loop never
converges. The last three (`linkedin`, `email`, `bluesky`) cover the
medium-fit axis — these reviewers only run for a post's non-blog renditions
(`config.mediums.<medium>.enabled`), never the blog draft itself.
Advisory/auto-apply reviewers (hook, impact, emotion, structure, wordsmith,
grammar, seo, link-opportunity, fact-checker, bullshit-detector, meta-content)
aren't covered yet — same pattern, lower priority since they don't block
convergence.

## How to run a reviewer against a fixture

There's no automated runner wired in yet (a thin one would fit the
`eval/run.ts` convention in the parent dir — see Future work). For now, run it
by hand:

1. Open `index.json`, find the fixture id you want to check.
2. Dispatch the named agent (e.g. `flatness-reviewer`) on the `trip` file (or
   the `clean` file). In Claude Code: `Task` tool with `subagent_type` set to
   the reviewer's name, prompt = "review this draft" (or "review this
   outline" for outline-mode fixtures), pointing it at the fixture file path.
3. Compare the agent's returned `gateFindings` against the fixture's
   `.expected.md`:
   - **Trip fixture:** `gateFindings` must be non-empty and must reference
     the quoted defect named in `.expected.md`.
   - **Clean fixture:** `gateFindings` must be empty (or, if the agent
     over-fires, that's a real prompt-drift signal worth investigating before
     dismissing it).
4. A drifted reviewer prompt is one that flips either result: misses the
   trip, or flags the clean. That's the regression these fixtures exist to
   catch — re-run this pair after any edit to the reviewer's `.md` file.

The `banned-phrase` fixture is the one exception: it targets a **deterministic**
signal (`scoreText()` in the human-tone skill's `scripts/eval/tone-grader.ts`,
installed alongside this skill), not an LLM agent. Its `.expected.md` has a
copy-pasteable `npx tsx` snippet instead of an agent-dispatch step — run that
directly.

## Future work

A thin runner (`run.ts`, mirroring `../run.ts`'s pattern) could loop
`index.json`, dispatch each reviewer via the Task tool, and diff the returned
`gateFindings` against each fixture's expected trip/clean disposition
automatically. Not built here — the checked-in fixtures + manifest + this
README are the required deliverable; wiring a runner is a natural next task
once the review army itself is dispatchable outside an interactive session.
