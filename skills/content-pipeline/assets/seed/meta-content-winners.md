# Meta-content winners — meta-content-reviewer memory

The `meta-content-reviewer` agent owns this file. It reads it before every
review and updates it after: newly confirmed winning patterns (hook, point,
emotional core, flare, structure) backed by real stats, keyed to slugs. Keep
it tidy — correct an entry rather than duplicating it.

**Cold-start:** until at least 8 posts have both impression and engagement
data, the reviewer stays advisory-only and does not write new patterns here —
see the reviewer's cold-start gate.

## Winning patterns (hook / point / emotional core / flare / structure)

<!-- One entry per confirmed pattern: what it is, the slugs + stats
     (rank/clicks/impressions/likes) that back it, dated. -->

## Update log

<!-- One line per run once cold-start lifts: date, N/8 count, what changed. -->

## Keep this file lean

The `meta-content-reviewer` reads this file in full on every dispatch — up to
10x per post across the outline and draft loops — so its size is a per-post
token tax. Correct entries in place rather than appending near-duplicates,
prune patterns that later stats supersede, and once the file passes ~200
lines run a manual summarization pass: collapse resolved/superseded entries
into a single one-line precedent each.
