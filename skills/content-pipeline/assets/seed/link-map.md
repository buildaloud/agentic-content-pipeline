# Link map — link-integrity-reviewer memory

The `link-integrity-reviewer` owns this file. It reads it before every check
and updates it after: new canonical URLs it confirms, new drift patterns it
catches. Keep it tidy — one row per entity, correct the row rather than
appending duplicates.

## Canonical URLs (what a link to this entity MUST point at)

| Entity | Canonical URL | Notes / common mistakes |
|---|---|---|
| <!-- your site --> | config.siteUrl | — |

## Keep this file lean

The `link-integrity-reviewer` reads this file in full on every dispatch — up
to 10x per post — so its size is a per-post token tax. Correct rows in place
rather than appending near-duplicates, prune entities that no longer get
linked, and once the file passes ~200 lines run a manual summarization pass:
collapse resolved drift patterns into a single one-line precedent each.
