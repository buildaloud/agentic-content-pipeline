# agentic-content-pipeline

An agentic content pipeline: one topic in, up to four medium renditions out —
blog post, LinkedIn post, email, Bluesky thread. A 12-stage orchestration
runs two review loops — 12 reviewers grading the outline, 15 grading the
draft, roster swapped per medium, drawn from a 26-agent roster — that fan
out, synthesize, and edit findings into apply-ready fixes; a deterministic
AI-tell tone gate (`aiScore < 15` on a 0-100 scale, plus a hard permaban
phrase list); and a generation-side learner, per medium, that feeds
confirmed fixes back into future drafts. Ships as two companion skills —
`content-pipeline` (the orchestrator) and `human-tone` (the tone gate) —
neither runs without the other.

## Quick start

Run inside your own content repo:

```
npx agentic-content-pipeline setup --harness claude   # or --harness codex
```

This:
- installs `content-pipeline` + `human-tone` into `.claude/skills/`
- registers the agents natively for your harness (skip `--harness` and they
  still dispatch from reference files, fully functional)
- interviews you into `content-pipeline.config.json`, validating your
  hero-image provider along the way
- seeds the working ledgers and voice/editorial-rules templates
- installs the skills' own runtime deps

Safe to re-run — every write is no-clobber. `setup --help` lists every
config flag, for a non-interactive run.

Then invoke the `content-pipeline` skill — "write a new post" — the
topic-approval gate is the only human checkpoint.

**Alternative install** — `npx skills add buildaloud/agentic-content-pipeline`
places both skills under `.claude/skills/` directly. Then run `npx tsx
skills/content-pipeline/scripts/setup.ts` from inside the installed skill
for the same config/seed/deps steps (skills-only; agents still dispatch from
reference files).

## Mediums

One topic can ship as up to four renditions, gated by `config.mediums`
(`blog` on by default; `linkedin` / `email` / `bluesky` opt-in). The content
unit is a folder, not a file:

```
yyyy-mm-dd-postname/
├── blogpost.md   # full frontmatter — title, description, pubDate, tags, heroImage...
├── linkedin.md   # frontmatter: postDate, status: draft, hook
├── email.md      # frontmatter: subject (≤50 chars), preheader (≤90 chars), status: draft
└── bluesky.md    # frontmatter: postDate, status: draft, thread; ≤300 chars/segment
```

Research and brief run once per topic, shared across mediums. Each enabled
medium then gets its own outline, outline-review loop, draft, and
draft-review loop, built from that medium's own formula doc
(`references/post-formulas.md`, `linkedin-formulas.md`, `email-formulas.md`,
`bluesky-formulas.md`) — and swaps in its own fit-reviewer gate in place of
`seo-reviewer` (`linkedin-reviewer`, `email-reviewer`, `bluesky-reviewer`).
The tone gate and core prose reviewers grade every medium unchanged.

**Publishing, honestly.** `blog` publishes the way it always has — commit,
and your site's own `pubDate` filter plus its daily rebuild does the drip.
`linkedin` / `email` / `bluesky` have no platform API in v1: the
`status: draft` file is the deliverable, and publishing it is yours.

## How the review loops work

Two fixpoint loops, one per grain (outline, then draft). Each round is
two-fold: a mechanical tone lint first, then a 12-15-reviewer fan-out (the
army never burns dispatches on tells a regex already caught). `synthesis`
dedups and ranks the findings into apply-ready edits (`quote` →
`replacement`), one editor agent applies them, and the loop re-reviews — up
to 5 rounds.

The tone gate is deterministic code, not a model's opinion: it runs before
every round and once more after the loop exits, so the loop's own last edit
pass is never the one thing left unmeasured.

## What you provide

- a voice file and an editorial-rules file (both optional — fill-in-the-blank
  templates ship if you don't have one; the skill can interview you into one)
- `bannedTerms` — anything that must never ship (internal tool names, codenames)
- source-material directories to scan for topic ideas (optional — skip it and
  the skill just asks you directly)
- a hero-image provider + key (`codex`, `openai-api`, `screenshot`, or `none`)
- a tone corpus (optional — recalibrates the AI-tell baseline to your own
  writing) and a stats file (optional — per-post performance data; shape at
  `skills/content-pipeline/references/stats-schema.md`)

## `tone` subcommand

`npx agentic-content-pipeline tone <file>` scores one file's
`aiScore`/permaban-phrase hits against the ship gate, outside the full
pipeline.

## Cost

This is not cheap to run. At defaults — two review loops, up to 5 rounds
each, roughly 12-15 reviewers per round — expect on the order of 100-160
agent dispatches and several million tokens per post. Run one post and check
your usage dashboard before queueing many. The fan-out also bursts up to 15
agents at once per round; mind your provider's rate limits. The payoff is
that a lot of what would otherwise be manual editing passes happens
unattended.

## Development

Contributing to this package itself (not consuming it): `npm install && npm
test` runs the full suite — 215 tests via vitest.

## Provenance

Extracted and generalized from a production build-in-public content
pipeline (July 2026); this package is a point-in-time fork, not a live
mirror.

## License

MIT — see `LICENSE`.
