---
name: plain-words
description: "Write prose a reader understands on the first read: ASD-STE100 Simplified Technical English, the repo's glossary terms, no jargon, and none of the AI reading tells (narrator voice, hedges, verdict closers, hooks). Plain mode is the default, for docs, READMEs, PRs, commits, Slack, emails, reports and reviews. Human mode is plain mode plus voice texture, for blog posts, personal writing and long Slack in a person's own voice. Use before shipping any prose a person will read. Gate with bin/tone (aiScore < 15)."
---

# Plain Words

Write so the reader gets it on the first read. Plain mode is the base for every piece of prose. Human mode adds a voice on top of it and never replaces it.

## Modes

- **plain** (default): STE100 guidance, the repo's glossary terms, no jargon, no reading tells. Formatting tells count a little. Use it for docs, READMEs, PR and commit text, short Slack, emails, reports, RFCs and reviews.
- **human**: everything in plain, plus the texture below and the full formatting checks. Use it for blog posts, personal or reflective writing, and long Slack in a person's own voice. content-pipeline scores its drafts in human mode.

Voice is a separate choice from mode. When you write as a person, read their voice file (`config.voiceFile` in a content-pipeline repo) in either mode. Their commits, PRs and short Slack are still plain mode.

Score with `bin/tone draft.md` (plain) or `bin/tone --mode human draft.md`.

## Plain words

Based on ASD-STE100 Simplified Technical English. The numbers are guidance, not a citation of the current issue.

- One idea per sentence. One instruction per sentence in a procedure.
- About 20 words for an instruction, 25 for a description. The grader counts prose sentences over 25 words.
- Active voice. Simple tenses: past for what happened, present for what is true of a system now.
- One word for one meaning. Once you call it "the run", do not call it "the job" two lines later.
- No noun stacks of more than 3 words ("run folder cleanup step owner" says nothing).
- Keep the articles ("the", "a"). Do not drop them to save space.
- Give a little context first: what this is about, then the point.
- Shorter and clearer, never blunter. Cut words, keep the courtesy.
- When the reader says they are lost, re-pitch with the missing context. Do not clip.
- Defined forms stay as defined: commands the reader types, identifiers, file paths, quoted text, error messages and a repo's title or commit conventions.

## Jargon

- No invented labels, codes or internal step names ("step 1c", "F4", "part b", "the T2 fix"). Name the thing in words: "the login retry rows", later "the retry rows".
- Spell out an abbreviation the first time unless the reader's glossary defines it.
- Prefer the everyday word to a team word, unless the glossary defines the team word.
- Ticket keys (ABC-123) and PR numbers (#300) are fine.

## Glossary terms

Use the repo's own words for its concepts.

1. Read `GLOSSARY.md`. When the repo has several, follow `GLOSSARY-MAP.md` to the one for the area you write about.
2. With no `GLOSSARY.md`, read `CONTEXT.md` and `CONTEXT-MAP.md`.
3. Use the defined term. Never use an `_Avoid_:` synonym where it means that concept. The same word in its everyday sense is fine.
4. With no glossary, use the words the code and docs already use, and define a new term once, where you first use it.

## Reading tells (weighted most)

These annoy a reader. Fix them first.

| Tell | Fix |
|---|---|
| **Narrator voice**: a sentence that only announces the next one ("That work then met a real customer"), or the writer talking about their own document ("the part worth repeating", "as noted above", "the item below") | Delete it. Go straight to the fact. Nobody says "that work then met a real customer" out loud. |
| **Abstract opener**: a paragraph about a person opens by characterizing them in habitual present ("Marcus checks his own numbers"). Plain mode scores it only after He or She, so "Claude owns the state" in a doc is fine. | Open in past tense on a specific occasion: "In August Marcus reported the savings with the arithmetic attached." Let the pattern come out of the facts. |
| **Verdict closer**: a paragraph ends on a summing-up flourish ("That is the right standard to hold") | Stop when the point is made. The evidence already carried it. |
| **Hedging and false modesty** ("it's worth noting", "arguably", "genuinely", "honestly", "frankly", "to be fair") | Say it flat or cut it. "This is slow." |
| **Signposting** ("Let's dive in", "In this section", "In conclusion") | Start with the substance. No throat-clearing, no recap. |
| **Rhetorical hook** ("The secret?", "And the unlock?", "Here's the thing:") | Cut it. Lead with the claim. |
| **Sales talk** (turbocharge, supercharge, game-changing, unlock, "the whole thesis", "here's the kicker") | Say what the thing does, plainly. |
| **AI vocabulary** (delve, leverage, showcase, robust, seamless, intricate, tapestry, underscore, testament, meticulously, paramount, utilize, navigate, foster) | Plain words: use, dig into, show, solid. |
| **Negative parallelism** ("it's not just X, it's Y", "X isn't Y, it's Z") | State the thing directly. |
| **"From X to Y"** breadth filler | Name the specific things, once. |
| **Copula avoidance** ("serves as", "boasts") | Write "is". |
| **Transitions** (Furthermore, Moreover, Additionally) | Drop most. Start with "And" or "But". |
| **Tidy-bow conclusion** ("the future looks bright") | Pick a side, or end when the point is made. |
| **Dramatic inversion** ("By the time X, Y had already Z") | Tell it in order: what happened, then what happened next. |
| **Long sentence** (over 25 words) | Split it. One idea per sentence. |

## Register: the part no score can catch

The grader measures patterns. These are choices you make before you write. Each one was a real correction from a human reader on prose that had already passed the gate.

- **First person, always, when you are the author.** "I asked him to", "I took that to the steering committee". Not "the manager notes that", not "it was decided". If you did it, say I. If they did it, name them.
- **Past tense for what happened. Present only for what is true of a system now.** "Marcus cut the hosting bill" is a report. "Marcus builds guardrails" is a character sketch.
- **Name the actor in every claim.** "The dependency was not visible at scoping" hides who missed it. Say whose call it was, including when it was yours.
- **Give several plain examples, not one polished one.** Three things someone can start on Monday beat one well-dressed instance.
- **Do not restate what the evidence just showed.** If the facts land the point, "which shows his strong ownership" takes away.
- **Own the framing out loud.** "I want", "I cautioned him", "I would like to see". Hedged institutional voice reads as nobody talking.
- **Never narrate your own document.** The reader is being told something, not walking a structure. If a sentence only connects two others, delete it and put the two facts side by side.
- **Cut mechanism detail that reads as a war story.** "It delivered and unblocked the customer" beats a blow-by-blow of four CI retries.

## Formatting tells (weighted less)

Still fix them. In plain mode they cost about a quarter of what they cost in human mode.

| Tell | Fix |
|---|---|
| **Em-dash** `—` | Use a period, comma, colon or parens. If you need a dash, `--`. |
| **Rule-of-three** ("fast, clean, and reliable") | Use one, two or an uneven four. |
| **Punch fragments** ("Not even for me." "Go look." stacked) | Complete the sentence. A rare fragment lands; a run of them reads like a trailer. |

## Human mode

Everything above still applies. Human mode adds a voice. Where texture pulls against a plain rule, the plain rule wins. Vary sentence length inside the 25-word limit. Keep fragments rare. Use contractions, not slang.

Texture to add:

- **Burstiness.** Put a short sentence next to a long one. Vary hard, within the limit.
- **Concrete specifics.** Named tools, exact numbers, real costs, file paths, elapsed time: "wasted $4k", "about 3 hours in". Never "a range of improvements".
- **Flat opinions.** State findings as fact. Hedge only when you are unsure, then commit.
- **Self-correction in the open** ("Eh no, that won't work.") reads human.
- **Symptom, cause, fix** when you explain a bug.
- **Understated and dry.** No hype adjectives, no exclamation stacks, no "I'm pleased to announce".
- **Functional emoji only.** The default is none; one `:sob:` or `:fire:` is the ceiling, and only where it does a job.

Registers (the voice note under Modes applies here too):

- **Blog prose**: published, so clean, and casual, opinionated and bursty. Do not fake typos. Voice specifics come from `config.voiceFile`, if set.
- **Personal or reflective posts** by a named person: that person's published voice, if the project has a style guide for it.
- **Chat or DM**: the author's rawest voice. Do not carry chat habits into published posts.

## Workflow

1. Draft in plain mode. Switch to human mode only for the writing named above.
2. Score it: `bin/tone draft.md` (add `--mode human` for human mode).
3. Fix the flagged tells, reading tells first. Score again until it is under 15.
4. Read it once more against the Register list. For human mode, check the texture too: clean but voiceless still fails.
5. For posts, run the LLM judge (`scripts/eval/judge.ts`) for what the counts cannot reach. See Eval below.

## Score one file

No project config needed.

```
bin/tone /abs/path/to/draft.md                       # from this skill's base directory
.claude/skills/plain-words/bin/tone draft.md         # from a consumer repo's root
.claude/skills/plain-words/bin/tone --mode human post.md
```

It prints the metrics, the mode and PASS or FAIL against the `aiScore < 15` gate, and exits 1 on a FAIL. Human mode's calibration corpus is the consumer's own `toneCorpusDir` (see Eval).

**Score only the prose you ship.** Headers, rulers, editor notes and scaffolding count as fragments and skew the result. Strip to the body text first.

**Reading the score.** Every weight is in `WEIGHTS` in `scripts/eval/tone-grader.ts`; each term is points per hit up to a cap.

- Both modes: abstract openers 7 per hit (cap 28; plain mode counts only a He or She subject), narrator voice 6 (cap 24), negative parallelism 6 (cap 24), AI vocabulary 5 (cap 20), verdict closers 4 (cap 16), hedges 5 (cap 15), sales talk 5 (cap 15), long sentences 2 (cap 10). A banned phrase adds 100.
- Plain mode: em-dash density `per1k × 1.5` up to 6, rule-of-three 1 per hit up to 4, fragments past the first 10 cost 1 each up to 2. No texture penalties.
- Human mode: em-dash density `per1k × 6` up to 22, rule-of-three 4 per hit up to 16, fragments past 10 up to 6, plus penalties for even sentence lengths, few contractions and repeated sentence starts.

The rule-of-three check fires on any `A, B, and C`, which includes two clauses joined with ", and". Splitting those into two sentences fixes the count.

## Eval

Paths are relative to this skill's base directory. `scripts/eval/tone-grader.ts` scores any string (`scoreText(text, { mode })`, mode `plain` by default) to an `aiScore` from 0 to 100. `scripts/eval/run.ts` compares a human corpus against drafts in human mode. Both read the consumer's `content-pipeline.config.json` (repo root): `contentDir` names the posts to scan, and `toneCorpusDir` the human baseline corpus (gitignored and optional).

**Gate:** shipped prose must score `aiScore < 15` with no banned phrase, in the mode it was written for.

**LLM judge (`scripts/eval/judge.ts`, advisory):** Gemini scores the same post from 0 to 10. It adds these axes:

- `authenticity` (0-10): lived experience, a real argument, trusts the reader.
- `emotion_impact` (0-10): does it land, or is it competent and dead.
- `ai_crutches`: a quoted list of structural AI tells it found.
- `capForCrutches` enforces a density cap in code: 3-4 `ai_crutches` caps `score` at 6 or less, 5 or more caps it at 4 or less. `would_a_human_type_this` flips to `false` only when that cap lowers the model's own score.

Run it: `npx tsx scripts/eval/judge.ts <post.md>` (needs `GEMINI_API_KEY`). It adds to the `aiScore < 15` gate and never replaces it.
