---
name: human-tone
description: Make your writing read as human, not AI. Strip the AI tells (em-dashes, rule-of-three, hedging, signposting, AI-vocab) and inject dev-voice texture (burstiness, concrete specifics, flat opinions). Baselines calibrated on a private Slack + Claude-prompt corpus; recalibrate against your own via config.toneCorpusDir. Use when drafting or editing any post, summary, or digest — and gate with the eval.
---

# Human Tone

Two jobs, both required: **strip AI tells** and **add human texture**. Removing tells alone yields sterile voiceless prose, which reads just as synthetic. (Reference: `blader/humanizer` on GitHub — good pattern bank; its hard em-dash ban is the right instinct here.)

Baselines below were calibrated on a private human-writing corpus (Claude prompts + team Slack). The measured human baseline: **aiScore ~2**; first-pass AI drafts scored **~40**. Target for shipped posts: **aiScore < 15** (run the eval). If you have your own corpus, point `config.toneCorpusDir` at it and re-run the eval to recalibrate these numbers for your own voice.

## Registers

- **Blog prose** (most posts): published, so clean and readable — but casual, opinionated, bursty. Not chat. Don't fake typos or lowercase-everything; do keep fragments, flat opinions, concrete detail. Voice specifics come from the configured voice file (`config.voiceFile`), if set.
- **Personal/reflective posts** (author is a named person rather than the configured voice persona): that person's own published voice, if a style guide for it exists in the project — casual, dry, understated, first person. Same tell-stripping applies.
- **Chat/DM** (not blog): the author's rawest voice — lowercase starts, trailing `...`, stacked questions, left-in typos. Don't import typos into published posts.

## The tells to strip

| Tell | Fix |
|---|---|
| **Em-dash** `—` (our #1 offender) | Use a period, comma, colon, or parens. If you truly need a dash, `--`. Corpus human rate is ~4.5/1k; keep near zero. |
| **Rule-of-three** ("fast, clean, and reliable") | Use one, two, or an uneven four. Let the count be arbitrary. |
| **Hedging** ("it's worth noting", "arguably", "genuinely") | Say it flat or cut it. "This is slow." |
| **Signposting** ("Let's dive in", "In this section", "In conclusion") | Start with the substance. No throat-clearing, no recap. |
| **AI-vocab** (delve, leverage, showcase, robust, seamless, intricate, tapestry, underscore, boasts) | Plain words: use, dig into, show, solid. |
| **Negative parallelism** ("it's not just X, it's Y" / "not only… but…") | State the thing directly. Cut the contrast setup. |
| **"From X to Y"** breadth filler | Name the actual specific things, once. |
| **Copula avoidance** ("serves as", "boasts") | Just write "is". |
| **Transitions** (Furthermore, Moreover, Additionally) | Drop most. Start with "And" or "But". |
| **Tidy bow conclusion** ("the future looks bright") | Pick a side, or end abruptly when the point's made. |

## The texture to add

- **Burstiness.** Jam a 3-word fragment against a 30-word run. Vary hard. (A real dev-corpus writer's messages can swing 4→60 words in one message.)
- **Concrete specifics over abstraction.** Named tools, exact numbers, real costs, file paths, elapsed time. "wasted $4k", "about 3 hours in", "wave 40 was butter". Never "a range of improvements".
- **Flat opinions, no hedge theater.** "forget it, I don't care about the dashboard." State findings as fact; hedge only when genuinely unsure, then commit.
- **Self-correction in the open** ("Eh no that won't work. Hmm — maybe it's not worth it.") reads human.
- **Symptom → cause → fix** when explaining a bug (a natural commit-body structure).
- **Understated, dry.** No hype adjectives, no exclamation stacks, no "I'm pleased to announce".
- **Functional emoji only** (the configured voice's default is none; a single `:sob:`/`:fire:` is the ceiling, and only where it does a job).

## Workflow

1. Draft.
2. Run the eval: `npx tsx scripts/eval/run.ts` (path relative to this skill's own base directory) — scores every post, ranks worst-first, lists tells.
3. Fix the flagged tells top-down; re-run until each post is **< 15**.
4. Re-read once for texture: is there a fragment? a real number? a flat opinion? If it's clean but voiceless, it still fails.
5. Optionally run the LLM judge (`scripts/eval/judge.ts`) for axes the deterministic count can't reach — see Eval below.

## Eval

All paths below are relative to this skill's own base directory. `scripts/eval/tone-grader.ts` scores any string (em-dash/1k, tricolons, hedges, signposts, ai-vocab, negative-parallelism, copula, burstiness → `aiScore` 0-100). `scripts/eval/run.ts` compares the human corpus against the drafts; both it and `tone-grader.ts` read the consumer's `content-pipeline.config.json` (repo root) for `contentDir` (which posts to scan) and `toneCorpusDir` (the human baseline corpus). The human corpus lives at `config.toneCorpusDir` (gitignored, private — local calibration only; optional, skipped entirely if unset).

**Gate:** shipped posts must score `aiScore < 15` on `tone-grader.ts`. This is the ship gate — required, not advisory.

**LLM judge (`scripts/eval/judge.ts`, advisory):** Gemini rubric-scores the same post 0-10 on top of the deterministic axes:
- `authenticity` (0-10) — lived experience, creative messiness, a real argument, trusts the reader.
- `emotion_impact` (0-10) — does it land, or is it competent-but-dead.
- `ai_crutches` — quoted list of structural AI tells found (e.g. an "X isn't Y, it's Z" line, an em-dash chain, a tidy-moral ending).
- `capForCrutches` enforces a density cap in code (not just prompt): 3-4 `ai_crutches` caps `score` at ≤6, 5+ caps it at ≤4; `would_a_human_type_this` flips to `false` only when that ≤4 cap actually lowers the model's own score (a self-score already ≤4 keeps its own verdict). A distinctive voice built on repeated negate-then-reframe scaffolding is still formulaic — `authenticity` can stay high while the overall `score` reflects the scaffolding.

Run it: `npx tsx scripts/eval/judge.ts <post.md>` (path relative to this skill's own base directory; needs `GEMINI_API_KEY`). These axes are additive to the `aiScore < 15` gate, not a replacement for it.
