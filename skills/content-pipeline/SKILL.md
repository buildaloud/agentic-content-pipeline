---
name: content-pipeline
description: Orchestrate an agentic content pipeline across mediums (blog, linkedin, email, bluesky — see config.mediums): source scan → topic gate → SEO research → brief → per-medium outline + outline review loop → draft + draft review loop (single-axis reviewer army, deterministic tone gate) → hero image → summary → assemble → commit; requires the companion human-tone skill from the same package.
---

# Content Pipeline Skill (Orchestrator)

Orchestrates content production end-to-end: config → source scan → topic gate → SEO research → brief → (per enabled medium) outline → outline review loop → draft → draft review loop → hero image → summary → assemble → schedule → commit. It's named generally (`content-pipeline`, not `blog-post`) because it's meant to be the home for other content tasks as they're added.

All paths below are relative to this skill's base directory (this file's own folder) unless written as `<config.field>`, which means a path inside the consumer's own repo, read from `content-pipeline.config.json`.

**Agent dispatch, stated once:** every named agent below (`brief-writer`, `drafter`, the reviewer army, etc.) is a prompt file under `references/agents/`, not a registered subagent. Dispatch it via the Agent tool: pick the model from the agent file's own frontmatter, and build the prompt from the mission context + "read `references/agents/<name>.md` for your definition" + whatever artifact(s) that step hands it.

---

## Mediums

One topic can ship as several renditions. `config.mediums` gates which ones run:
`{ blog: {enabled}, linkedin: {enabled}, email: {enabled}, bluesky: {enabled} }`
— `blog` defaults on; the others default off until the consumer opts in.

**The content unit is a folder**, not a single file:
`<config.contentDir>/yyyy-mm-dd-postname/`, holding one rendition file per
enabled medium plus the hero image:
- `blogpost.md` — today's full blog frontmatter (title, description, pubDate,
  author, tags, heroImage, targetKeyword, etc. — see Assemble below).
- `linkedin.md` — frontmatter `postDate`, `status: draft`, `hook`; body is the
  post text.
- `email.md` — frontmatter `subject` (≤50 chars), `preheader` (≤90 chars),
  `status: draft`; body is the email text.
- `bluesky.md` — frontmatter `postDate`, `status: draft`, `thread: true|false`;
  body is a single post, or thread segments separated by a line containing
  only `---`, each segment ≤300 characters.

**Flow.** Steps 1–4 (source scan → topic gate → SEO research → brief) run
**once per topic**, shared across every medium. From Step 4.5 on, the outline
→ outline review loop → draft → draft review loop → assemble sequence runs
**once per enabled medium**: each medium's outline is built from that
medium's own formula doc (`references/post-formulas.md` for blog,
`references/linkedin-formulas.md`, `references/email-formulas.md`,
`references/bluesky-formulas.md`), and each medium's draft is assembled into
its own file inside the shared folder. The tone gate and the core (voice/
emotion/flatness/formulaic/etc.) reviewers run for **every** medium — they
grade prose, not platform. Blog is the reference flow described step-by-step
below; the other mediums follow the identical mechanics with the swaps noted
here.

**Roster deltas** (Steps 4.6 and 6's fan-out — see those steps for the full
blog army list):
| medium | swap | link-integrity |
|---|---|---|
| blog | `seo-reviewer` + `link-opportunity-reviewer` (today's roster, unchanged) | ✓ |
| linkedin | `seo-reviewer` OUT, `linkedin-reviewer` IN (gate) | ✓ |
| email | `seo-reviewer` OUT, `email-reviewer` IN (gate) | ✓ |
| bluesky | `seo-reviewer` OUT, `bluesky-reviewer` IN (gate) | ✓ |

`link-integrity-reviewer` runs for every medium unchanged — links must
resolve everywhere, not just on blog.

**Publish adapters (v1, honest).** `blog` publishes today's way: commit +
push, and the consumer's own static drip (a `pubDate` filter plus a daily
rebuild) reveals it on schedule — that mechanism is the consumer's, not this
skill's; document it explicitly per project. `linkedin` / `email` / `bluesky`
have no platform API in v1 — the `.md` file itself, with `status: draft` in
its frontmatter, **is** the deliverable. Publishing those three is either a
manual copy-paste by the human owner or the consumer's own downstream
automation; this skill stops at producing a correct, reviewed draft file.

**Scheduling note.** The drip applies to the FOLDER, not to each file
individually: one `pubDate`, read from `blogpost.md`, drives the drip for the
whole folder. `linkedin.md` / `email.md` / `bluesky.md` inherit that same date
as their `postDate` unless the consumer explicitly overrides it per medium.

**Learning.** `content-learner` (Step 11.7) tallies patterns per medium — a
pattern's tally entry carries a `medium` field, and promoted pitfalls land in
the matching per-medium section of `drafter-pitfalls.md` when the pattern is
medium-specific, or the general section when it recurs across 2+ mediums. See
Step 11.7.

---

## Step 0 — Config

**Fastest path:** run `npx tsx <skill-base>/scripts/setup.ts` (add `--harness claude` or `--harness codex` to also register the agents natively); the interview below is the fallback if the user prefers the assistant-led path.

Look for `content-pipeline.config.json` at the consumer repo's root. If it exists, read it — every step below reads from it.

If it's missing, **interview the user** before doing anything else. Ask for:
- **voiceFile** — path to a doc describing the writing voice/persona (optional; if skipped, write in a plain, direct, professional voice and say so).
- **editorialRulesFile** — path to house editorial rules (optional; if skipped, skip rule-specific checks and say so).
- **contentDir** — where posts live (e.g. `src/content/blog`).
- **mediums** — which content mediums to produce per post: blog (default on),
  linkedin, email, bluesky (each default off). See Mediums above for what each
  enabled medium produces and how the roster/publish adapter changes per one.
- **docsRoot** — where this pipeline's own working docs/ledgers live (e.g. `docs`).
- **siteUrl** — the site's public URL.
- **bannedTerms** — any strings that must never appear in published content (internal tool names, codenames, etc).
- **sourceMaterial** — where topic material comes from: `chatsDir`, `claudeProjectsDir`, `relevancePatterns`. Any/all may be left empty — if so, Step 1 asks the user for source material directly instead of scanning.
- **heroImages.provider** — `codex | openai-api | screenshot | none`. If `openai-api`, also ask for the env var name holding the key (default `OPENAI_API_KEY`); if `codex`, confirm the `codex` CLI is installed and configured. `styleNotes` — free text on visual style, optional.
- **toneCorpusDir** — optional path to a corpus for calibrating the human-tone skill's baselines; skip if none.
- **statsFile** — optional path to a JSON stats file with `postStats.byPost` entries (clicks, impressions, ctr, position, pageviews, likes per post — see `references/stats-schema.md` for the exact shape). Leave empty if you don't track stats yet; features that read it (Step 10.5's learning loop, `meta-content-reviewer`) degrade gracefully without it.

Write the answers to `content-pipeline.config.json` using `assets/config.template.json` as the shape. Never guess these values — a wrong content directory or voice file produces posts nobody wants.

**No voice file yet?** Copy `assets/seed/voice-template.md` to the configured path and OFFER to fill it in by interviewing the user (or mining samples they point you at — existing posts, chat exports). Same for `assets/seed/editorial-rules-template.md` if there's no `editorialRulesFile` yet.

**Install runtime deps.** Run `npm install` inside `<skill-base>/scripts/` once — it installs `zod` and `js-yaml`, used by this skill's schema and eval helpers.

**Preflight.** Verify `../human-tone/scripts/eval/tone-grader.ts` exists (relative to this skill's own base directory). If it doesn't, STOP and tell the user: the `human-tone` skill from the same package must be installed alongside `content-pipeline` — the deterministic tone gate in Step 6 depends on it.

**Seed the working ledgers.** Copy each file in `assets/seed/` into `<config.docsRoot>/content-pipeline/` if not already present there (`facts.md`, `link-map.md`, `bullshit-ledger.md`, `learnings-tally.json`, `drafter-pitfalls.md`, `meta-content-winners.md`). Then seed per-agent memory: grep `references/agents/` for the string `.claude/agent-memory/` to derive the exact list of memory-backed agents — don't hardcode a count here, it can drift as agents are added or edited (14 as of this writing: `hook-reviewer`, `impact-reviewer`, `emotion-reviewer`, `flatness-reviewer`, `formulaic-reviewer`, `voice-reviewer`, `structure-reviewer`, `wordsmith-reviewer`, `grammar-reviewer`, `seo-reviewer`, `link-opportunity-reviewer`, `outline-structure-reviewer`, `synthesis`, `drafter`). For each of those agents, copy `assets/seed/agent-memory-MEMORY.template.md` to `.claude/agent-memory/<agent>/MEMORY.md` if that file doesn't already exist. The other 4 memory-backed agents — `fact-checker`, `bullshit-detector`, `link-integrity-reviewer`, `meta-content-reviewer` — don't use `.claude/agent-memory/` at all; their ledgers are the `<config.docsRoot>/content-pipeline/` copies seeded above (`facts.md`, `bullshit-ledger.md`, `link-map.md`, `meta-content-winners.md`, respectively). Never overwrite an existing ledger or memory file — these accumulate real learnings across posts.

**Two more memory-backed dispatches, outside `references/agents/`.** `outline-builder` (Step 4.5) and `editor` (the Edit step in Steps 4.6 and 6) are ad hoc dispatches with no dedicated agent file, so the grep above never finds them — seed `.claude/agent-memory/outline-builder/MEMORY.md` and `.claude/agent-memory/editor/MEMORY.md` explicitly, the same way, since they can't be derived automatically.

---

## Entry paths

**Organic post:** proceed through Steps 1–2 normally.

**Scheduled/queued post:** if the consumer maintains their own topic queue or schedule (this pipeline doesn't require one — see "Scheduling" below), read it for the topic and target `pubDate`. Skip topic proposal — the topic is already approved. Start at Step 3 with that topic. The perspective call (Step 2) still applies. **Keyword discovery (Step 2a) is SKIPPED** on this path — there's nothing to inform, the topic is pre-approved; `seo-researcher` falls back to its own keyword-selection methodology in Step 3. Assemble (Step 10) still persists `targetKeyword`/`secondaryKeywords`/`searchIntent` exactly as it does for organic posts.

---

## Process

### 1. Gather Context and Material

**Read in parallel:**
```
<config.voiceFile>       (if set)
<config.editorialRulesFile>  (if set)
<contentDir>/*.md  (the 2–3 most recent posts)
```

**Scan for new source material**, if `config.sourceMaterial` has any paths set:
```bash
npx tsx scripts/check-new-content.ts
```
Reports which source files have new content since the last post, using byte-offset cursors — reads only the delta, not the full file. For files with significant new content: `--summary <filename>`. To find sessions not yet wired into `sourceMaterial`: `--discover`. To create/update the script's own config: `--setup`.

If `config.sourceMaterial` is unset (or discovery finds nothing), **ask the user directly** what the post should be about — don't invent source material.

---

### 2. Topic-Approval Gate

**2a. Keyword Discovery** — before presenting ideas, dispatch `seo-researcher` with `model: "opus"` in **discovery mode**, passing `seedTopics: string[]` (2–3 candidate topics). One dispatch, not one per candidate. It fans out via `web-researcher` (autocomplete / PAA / related / SERP), runs the cannibalization check once, and returns a `KeywordOpportunitySet` keyed by candidate — schema at `scripts/lib/keyword-opportunity-schema.ts`. Skip this sub-step entirely on the scheduled/queued path (see Entry paths above).

Present the user with 2–3 post ideas based on new material. Per idea: a proposed title, a 1–2 sentence summary, which source material it draws from, and its keyword opportunity set from Step 2a (top opportunities, intent, any cannibalization flag) plus the `caveat` line verbatim, so the choice is keyword-informed.

**Stop and wait for the user's choice.** Nothing below runs until a topic is approved. Note any constraints the user gives ("don't mention X", "focus on Y") and apply them throughout.

**Perspective call (optional).** If the site writes from more than one voice (e.g. a configured AI persona for its own build-in-public work, and the human owner's own first person for their personal work), decide which applies to this topic now, and carry it through every downstream step (drafter voice, Assemble's `author` field). Most single-voice sites can skip this and just use `config.voiceFile` throughout.

---

### 3. SEO Research — `seo-researcher` agent (Opus, refinement mode)

Dispatch `seo-researcher` with `model: "opus"` (deep SEO/market research warrants the bigger model) in **refinement mode**, and: the approved topic + source digest, the approved topic's `KeywordOpportunitySet` entry from Step 2a (omit on the scheduled/queued path — discovery didn't run), and `<config.editorialRulesFile>` (if set).

When a discovery output is passed, refinement **binds** to it: the strongest-ranked opportunity for the approved topic has its `keyword` carried straight into `targetKeyword`, not re-derived. A per-keyword override at the Step 2 gate is not yet supported. On the scheduled/queued path (no discovery output), the agent falls back to its own keyword-selection methodology.

The agent does real web/keyword research (WebSearch / WebFetch) and returns a typed `ResearchResult`: `targetKeyword`, `secondaryKeywords`, `searchIntent`, `marketResearch[]` (cited claims + source URLs), `keywordRationale`.

Do not proceed if `marketResearch[]` is empty — fabricated or missing sources fail the eval.

---

### 4. Brief — `brief-writer` agent (Sonnet)

Dispatch `brief-writer` with `model: "sonnet"` and: the approved topic + source digest, the full `ResearchResult` from Step 3, and `<config.editorialRulesFile>` + `references/post-formulas.md`.

`brief-writer` is the **sole author** of the Brief. It picks a `postFormula` from `references/post-formulas.md` (war-story, how-i-built-x, teardown, contrarian-take, decision-log) and builds `outline[]` to that formula's beats. It carries the `ResearchResult` fields unchanged and authors all editorial fields. Output is a schema-valid `.brief.md` file (YAML frontmatter, no slug — slug is derived at Step 10). Schema: `scripts/lib/brief-schema.ts`.

Brief fields: `topic`, `targetKeyword`, `secondaryKeywords`, `searchIntent`, `postFormula`, `seoTitle` (≤60 chars, includes `targetKeyword`), `headlineVariants[]`, `metaDescription` (≤155 chars, includes `targetKeyword`), `hook`, `outline[]` (4–8 beats, shaped by `postFormula`), `internalLinks[]` (≥2, on-topic — see the link-map ledger), `cta`, `socialBlurb` (≤280 chars), `imageConcept` (hero-image prompt seed), `marketResearch[]` (claim + source URL per entry), `keywordRationale`.

---

### 4.5. Outline — expand the Brief into `<slug>.outline.md`

**Runs once per enabled medium** (see Mediums above). This step and every step
through Assemble (10) repeats per medium in `config.mediums`; what's described
below is the blog rendition — swap `references/post-formulas.md` for the
medium's own formula doc (`linkedin-formulas.md` / `email-formulas.md` /
`bluesky-formulas.md`) and its `postFormula` list when building a non-blog
outline, everything else in this step is identical.

Dispatch a Sonnet agent (ad hoc — no dedicated agent file, same pattern as Step 9) with: the full Brief from Step 4, `references/post-formulas.md` + `references/paragraph-formulas.md` (expand the Brief's `postFormula` beats into full paragraph nodes), `<config.voiceFile>` (if set) for voice register, and `<config.docsRoot>/content-pipeline/drafter-pitfalls.md` (pre-empt the review army's recurring flags in the plan — especially no negative parallelism in `point`/`ourTake`/`gateGuidance`, which the drafter renders verbatim; the `flare` line is the one exemption). This dispatch reads `.claude/agent-memory/outline-builder/MEMORY.md` FIRST, if it has content, and appends one dated line only for a durable recurring lesson before returning (see Step 0's memory-seeding note — this is a dispatch-level ledger, not a `references/agents/` file).

It writes `<slug>.outline.md` — a YAML meta block (`point`, `hook`, `emotionalCore`, `flare`, `targetAudience`, `targetKeyword`, `searchIntent`, `postFormula`) plus an ordered `paragraphs[]` list, one node per beat, each carrying `order`, `topic`, `goal`, `paragraphFormula`, `audienceNote`, `intendedBeat`, `ourTake`, `facts`, `sources`, `keyword`, `links`, `gateGuidance`, `rendersAsProse`. Validate against `OutlineSchema` (`scripts/lib/outline-schema.ts`) before proceeding — a schema failure routes back to this step, not forward. This outline becomes both the drafter's input (Step 5) and the rubric every reviewer grades against.

---

### 4.6. Outline Review Loop — fan-out → synthesize → edit → re-review (◆)

A fixpoint loop over the outline artifact from Step 4.5, per `references/review-fanout-design.md`. **Runs once per enabled medium**, on that medium's own outline file. The list below is the blog roster; for a non-blog medium, swap `seo-reviewer` for that medium's own reviewer (`linkedin-reviewer` / `email-reviewer` / `bluesky-reviewer`) per the Roster deltas table in Mediums above — every other reviewer in the list runs unchanged.

**Round (repeat until converged or round cap 5):**
1. **Fan out** — dispatch, in parallel via the Agent tool (model per each agent's own frontmatter, `sonnet` unless stated otherwise), the OUTLINE-mode reviewers: `hook-reviewer`, `impact-reviewer`, `emotion-reviewer`, `flatness-reviewer`, `formulaic-reviewer`, `voice-reviewer`, `seo-reviewer`, `link-opportunity-reviewer`, `outline-structure-reviewer`, `meta-content-reviewer`, `fact-checker`, `bullshit-detector`. Each gets the outline file path, the Brief, and whatever reference docs its own file names. Each returns the shared adversarial-constructive finding schema (`axis`, `verdict`, `gateFindings[]`, `elevations[]`).
2. **Synthesize** — dispatch `synthesis` with the outline path, all 12 findings arrays, the round number, and (on rounds after the first) its own prior round's consolidated edits + verdict, so it can: confirm the prior round's gate edits actually landed in the current artifact (an un-applied prior gate edit is the top priority, ahead of any new nitpick), never re-open a span that passed last round unless the editor touched it, and re-drop (with a one-line "already dropped round N-1") any churn it already ruled out. Disposition per reviewer is classified by `scripts/lib/review-disposition.ts`'s `classifyDisposition` (single source of truth — gate / auto-apply / advisory); hook is advisory unless missing/broken, in which case it escalates to gate (`HOOK_ESCALATION_NOTE` in that file). Synthesis dedups, ranks, resolves conflicting edits, and runs the content-safety scrub + banned-term scan against `config.bannedTerms` (see Content Safety) — synthesis owns both checks.
3. **Edit** — on another round, dispatch a Sonnet editor agent (Read + Edit, ad hoc — no dedicated agent file) with synthesis's consolidated edit set to apply the fixes directly to `<slug>.outline.md`. Findings are apply-ready (`quote` → `replacement`, verbatim) so the editor applies them mechanically, not by re-interpreting prose. This dispatch reads `.claude/agent-memory/editor/MEMORY.md` FIRST, if it has content, and appends one dated line only for a durable recurring lesson before returning — the editor's known recurring failure class is re-introducing tone tells while applying content edits, so check your own replacement text against that before returning it (dispatch-level ledger, same caveat as `outline-builder` above).
4. **Re-review** — go to 1, unless the plateau check below exits the loop instead.

**Convergence:** zero gate findings + safety CLEAR + banned CLEAR → **auto-proceed to Step 5** — no human gate, an explicit design decision. **Plateau exit (round 2+):** if this round's gate-finding count does not fall below the prior round's, apply this round's consolidated edits once more (step 3), then exit the loop instead of re-reviewing — don't burn the rest of the round-cap budget on a round that isn't shrinking. Round cap (5) hit with gate findings still open → surface to the user with the remaining blockers.

---

### 5. Draft — `drafter` agent (Sonnet)

**Runs once per enabled medium**, drafting that medium's own approved outline
into that medium's own draft file (see Mediums above).

Dispatch `drafter` with `model: "sonnet"` and: the perspective call from Step 2 (if used), the **approved `<slug>.outline.md`** from Step 4.6 — the drafter's primary input and the rubric every beat must satisfy (`goal`, `ourTake`, `intendedBeat`, `facts`, `sources`, `keyword`, `links`, `gateGuidance`, `paragraphFormula` per node) — the Brief's **editorial and publish fields** the outline doesn't carry (`seoTitle`, `headlineVariants`, `metaDescription`, `internalLinks`, `cta`, `socialBlurb`, `imageConcept`; exclude `marketResearch[]` and `keywordRationale`), `<config.voiceFile>`, and the 2–3 most recent posts for voice calibration.

**Writing rules:** write in the assigned voice/perspective; direct, conversational, no corporate fluff; short paragraphs, concrete details, real numbers; credit named contributors for their discoveries/decisions; honest about failures and limitations; no fake enthusiasm, no emoji overload; end with a **Sources** section as a markdown bulleted list — one linked source per bullet, never a prose paragraph or a loose run of links.

**Voice > SEO.** Never flatten the voice for a keyword. Voice is the product; SEO is a constraint.

**Content structure:** hook/intro → substance → what's next → a bulleted Sources footer.

---

### 6. Draft Review Loop — fan-out → synthesize → edit → re-review (◆)

One fixpoint loop over the drafted post, at draft grain, graded against the outline's per-beat guidance — same shape as Step 4.6's outline loop, one grain deeper. Design: `references/review-fanout-design.md`. **Runs once per enabled medium**, on that medium's own draft; the list below is the blog roster — for a non-blog medium, swap `seo-reviewer` for that medium's own reviewer per the Roster deltas table in Mediums above, every other reviewer unchanged. The tone gate below runs for every medium, on that medium's own draft text.

**Deterministic tone gate — mechanical, feeds synthesis directly, no LLM discretion.** Run before the first round and again after every edit pass, on the single current draft (never the whole corpus):
1. Call `scoreText` (`../human-tone/scripts/eval/tone-grader.ts`) on this draft's body. If `banned > 0` OR `aiScore >= 15`, that's a mandatory critical gate finding — inject it directly into synthesis's gate set (see Synthesize below). This is a hard code check: a hit here gates regardless of what any reviewer concludes about the same prose.
2. Call `judgeText` (`../human-tone/scripts/eval/judge.ts`), or the `runJudgePass` helper `../human-tone/scripts/eval/run.ts` exports, on just this draft, for emotional impact and formulaic-crutch density — handed to synthesis as evidence alongside the mechanical result. If the judge's API key env var is unset, `runJudgePass` returns `null` — note in the round's output that the judge pass was skipped so its absence is visible. That doesn't block the loop: the deterministic `scoreText`/banned gate above is the hard floor regardless of judge availability.

`npx tsx ../human-tone/scripts/eval/run.ts` scores the whole content corpus — that's a manual calibration tool for checking the eval baseline, never a step in this loop.

Hand both scores to the fan-out too — `flatness-reviewer`, `formulaic-reviewer`, and `voice-reviewer` add LLM judgment on top of the mechanical gate above; they're additional coverage, not a substitute for it.

**Every round is two-fold: mechanical lint, then the fan-out.** The army should never burn 15 reviewers on tells a regex already knows. Round 1 lints the fresh draft; later rounds lint the previous round's editor output — that's exactly where re-introduced tells come from. The post-loop tone confirmation below still guards the exit, so the loop is gated clean at the top of every cycle and on the way out.

**Round (repeat until converged or round cap 5):**
0. **Mechanical lint** — score the current draft with `scoreText`. If dirty (`banned > 0` OR `aiScore >= 15`): dispatch one Sonnet tone-only de-tell pass against `<config.docsRoot>/content-pipeline/drafter-pitfalls.md` (facts/claims/links/structure untouched, and its permaban phrases never re-introduced), then re-score. If clean, skip the edit — an unnecessary editor pass only risks introducing tells. The post-lint score is the tone-gate result handed to synthesis in step 2.
1. **Fan out** — dispatch, in parallel, the 15 draft-mode reviewers (`outline-structure-reviewer` is outline-only, not in this list): `hook-reviewer`, `impact-reviewer`, `emotion-reviewer`, `flatness-reviewer`, `formulaic-reviewer`, `voice-reviewer`, `structure-reviewer`, `wordsmith-reviewer`, `grammar-reviewer`, `seo-reviewer`, `link-integrity-reviewer`, `link-opportunity-reviewer`, `fact-checker`, `bullshit-detector`, `meta-content-reviewer`. Each gets the draft file path, the approved outline (the per-beat rubric), the Brief, and the tone-signal scores above. `fact-checker`, `link-integrity-reviewer`, and `bullshit-detector` each read their own ledger under `<config.docsRoot>/content-pipeline/` (`facts.md`, `link-map.md`, `bullshit-ledger.md`) and keep updating it after every run.
2. **Synthesize** — dispatch `synthesis` with the draft path, all 15 findings arrays, the round number, the mechanical tone-gate result from above, and (on rounds after the first) its own prior round's consolidated edits + verdict, so it can: confirm the prior round's gate edits actually landed in the current artifact (an un-applied prior gate edit is the top priority, ahead of any new nitpick), never re-open a span that passed last round unless the editor touched it, and re-drop (with a one-line "already dropped round N-1") any churn it already ruled out. Disposition per reviewer is classified by `classifyDisposition` as in Step 4.6. Synthesis dedups, ranks, resolves conflicting edits, folds in the mandatory tone-gate finding (if any) as a gate finding no reviewer discretion can override, and runs the content-safety scrub + banned-term scan (see Content Safety) — there's no separate content-reviewer step.
3. **Edit** — on another round, dispatch a Sonnet editor agent (Read + Edit, ad hoc) with synthesis's consolidated edit set to revise the draft file directly — gate fixes always applied, auto-apply axes applied directly, advisory/elevation edits applied when clearly better. This dispatch reads `.claude/agent-memory/editor/MEMORY.md` FIRST, if it has content, and appends one dated line only for a durable recurring lesson before returning — the editor's known recurring failure class is re-introducing tone tells while applying content edits, so check your own replacement text against that (and against the mechanical lint in step 0 above) before returning it.
4. **Re-review** — go to 1, unless the plateau check below exits the loop instead.

**Convergence:** zero gate findings + safety CLEAR + banned CLEAR → proceed to the tone confirmation below. **Plateau exit (round 2+):** if this round's gate-finding count does not fall below the prior round's, apply this round's consolidated edits once more (step 3), then exit the loop instead of re-reviewing — the mandatory final tone confirmation below still guards the exit either way. Round cap (5) hit with gate findings still open → surface to the user with the remaining blockers, same as Step 4.6. When `bullshit-detector` flags an overclaim whose honest fix lives in the product itself, open a tracking issue per Step 11.5 rather than just softening the sentence.

**Final tone confirmation (mandatory — the loop's last edit is otherwise unmeasured).** The loop scores tone at the start of each round, so the last editor pass is never re-scored — it can regress a clean draft by introducing tells (e.g. rule-of-three lists) while applying content edits. So after the loop exits, run `scoreText` one more time on the final draft. If `banned > 0` OR `aiScore >= 15`, dispatch a Sonnet **tone-only de-tell pass** (change nothing about facts / claims / links / structure — only drive the tells out) and re-score; cap at 2 de-tell passes, then surface if it still won't clear. The returned draft must always be tone-clean, regardless of where the review loop stopped.

---

### 8. Hero Image

Gate on `config.heroImages.provider`.

**`provider: "none"`** — skip this step; note in the summary that no hero image was generated.

**`provider: "screenshot"`** — when the post has real UI to show: capture it headless, e.g. `--headless --disable-gpu --window-size=1600,900 --screenshot=/tmp/<slug>.png <URL>` with Chrome or Playwright's `headless_shell`. Save (or composite, if the consumer has their own framing tooling) to the post's image location.

**`provider: "codex"`** — generate with `codex exec` (imagegen) when there's no real UI to shoot. Use `Brief.imageConcept` plus `config.heroImages.styleNotes` as the prompt seed. Two operational gotchas: run from the repo root (a trusted/git dir) with stdin closed, or codex blocks — `codex exec 'Use imagegen to create a 16:9 image: <concept>. <styleNotes>' < /dev/null` — and the `exec` sandbox is read-only, so it saves to `~/.codex/generated_images/<uuid>/*.png` (it prints the path); copy the newest file into place.

**`provider: "openai-api"`** — OpenAI Images API, `model: "gpt-image-1"` (not `dall-e-3`), `size: "1536x1024"`, `quality: "high"`, `n: 1`, no `response_format` (b64_json default). Key from the env var named in `config.heroImages.openaiApiKeyEnv`.

**Shell safety.** `Brief.imageConcept`, `config.heroImages.styleNotes`, and any URL or slug used above are content-derived — never interpolate them directly into a shell command string. Write the prompt to a temp file (`cat > /tmp/<slug>-prompt.txt <<'EOF'` … `EOF`, single-quoted heredoc delimiter) or pass it via stdin, and reject any value containing quotes, backticks, or `$(` before it reaches a shell command. The same applies to the screenshot URL: never splice a content-derived URL straight into the `--screenshot=` invocation without this check.

Any path: author alt text, and carry both the image path and alt text to Assemble. If generation fails, retry once; if it still fails, stop and report rather than shipping a post silently missing its image.

---

### 9. Structured Summary (optional, if your content schema has one)

If the consumer's content schema defines a structured summary field, dispatch a Sonnet agent with the final draft and that schema definition; it returns the summary in that shape. No em-dashes, no rule-of-three — run it past the human-tone rules. Goes straight into the post's frontmatter at Assemble.

**Rolling digest (optional).** If the consumer's project maintains a rolling digest of recent posts (a JSON file appended to at publish time, or similar), append a fresh entry summarizing posts in whatever trailing window that file already uses — a fresh synthesis of that window, not a concatenation of past entries. Most consumers won't have this; skip if you don't recognize the pattern.

---

### 10. Assemble — Orchestrator Owns Final Frontmatter

The orchestrator writes the final rendition file(s), one per enabled medium, into the shared folder. Agents do not set frontmatter.

Derive `slug` (kebab-case from `Brief.seoTitle`, no stop-word bloat) and `pubDate` (UTC, ISO 8601 ending in `Z`, e.g. `"2026-08-07T15:00:00Z"` — never a local offset; the scheduled-post date if on that path, otherwise now). Create the folder `<config.contentDir>/<pubDate-as-yyyy-mm-dd>-<slug>/` if it doesn't exist yet — this is the one folder every enabled medium's rendition writes into.

**`blogpost.md`** (always written — blog defaults on): adapt to your project's own content schema — commonly needed fields: `title`, `description`, `pubDate`, `tags` (from the Brief), `author` (from the Step 2 perspective call, if used), `targetKeyword`/`secondaryKeywords`/`searchIntent` (forwarded verbatim from the Brief, which carries them unchanged from Step 3's `ResearchResult`), `summary` (from Step 9, if used), and the hero image path + alt text from Step 8 (if generated). This keeps today's full frontmatter shape unchanged.

**`linkedin.md`** (if `config.mediums.linkedin.enabled`): frontmatter `postDate` (inherits the folder's `pubDate` unless overridden — see the Scheduling note in Mediums above), `status: draft`, `hook` (the outline's `hook` meta field for this rendition); body is the drafted post text, verbatim from Step 6's converged LinkedIn draft.

**`email.md`** (if `config.mediums.email.enabled`): frontmatter `subject` (≤50 chars, from the Brief/outline for this rendition), `preheader` (≤90 chars), `status: draft`; body is the drafted email text.

**`bluesky.md`** (if `config.mediums.bluesky.enabled`): frontmatter `postDate` (inherits the folder's `pubDate` unless overridden), `status: draft`, `thread` (`true`/`false`, from the outline's declared `postFormula`); body is the drafted post — a single post, or thread segments separated by a line containing only `---`, each segment already verified ≤300 characters by `bluesky-reviewer`.

Write each enabled medium's file to `<folder>/<medium>.md`.

---

### 10.5 Score & Schedule — SEO impact model (optional)

If you want the pipeline to place posts on a calendar rather than publishing immediately, don't hand-pick `pubDate` — place it per `references/seo-impact-model.md`:
1. **Bucket the post.** Bucket A = the site owner's own work/decisions (front-loaded by recency, time-sensitive). Bucket B = the evergreen pool, drained highest-SEO-first.
2. **Score it** (0–100) on `intentValue`, `opportunity`, `engagement`, `freshness`, using the seo-researcher output + a hook-quality read + judgment — dispatch `references/agents/content-judge.md` for the hook-quality read that feeds the `engagement` sub-score. Record all four sub-scores, not just the total.
3. **Draw the slot.** Bucket A takes the earliest open date. Bucket B posts compete as a pool: the next slot not claimed by fresher Bucket A work goes to the highest-scored unpublished Bucket B post; provisional dates on lower-scored posts yield to higher-scored ones. Keep to a sane cadence (default: ≤1/day).
4. **Log the prediction** (slug, bucket, pubDate, score, factors, one-line rationale, `actual: null`) wherever the consumer's project keeps structured data, if anywhere.

**Learning loop**, if the consumer wants it: reconcile predictions against actual performance stats when they arrive, note which factor mispredicted, nudge weights, and re-draw the remaining queue. See the model doc for detail. Skip this whole step if the consumer just wants to publish immediately.

---

### 11. Bookkeeping

If `config.sourceMaterial` is set and Step 1's scanner was used, advance its cursors:
```bash
npx tsx scripts/check-new-content.ts --update
```
If the consumer's project keeps its own topic/backlog tracking file, update it with newly covered and newly discovered topics — adapt to whatever format already exists there. Skip if there isn't one.

---

### 11.5 Capture product-learnings — build → write → learn → refactor (optional)

When the post is about something the team built, ask one question before shipping: *did researching or writing this teach us something the product should absorb?* A better mechanism, a real limitation, a source that named a stronger approach. `bullshit-detector` (Step 6) often surfaces exactly these.

If yes: open a tracking issue in the consumer's own issue tracker referencing the learning, and narrate it in the post as part of the honest story — link around the source that taught you rather than reproducing it wholesale.

If the learning is big enough that the post's current claim is now dishonest, route back and fix the claim (Step 6) before shipping.

---

### 11.7 Learn — generation-side learner

After the review loops finish, dispatch `content-learner` (`model: "sonnet"`) once **per enabled medium** for this post, with: the slug, the **medium** (`blog` / `linkedin` / `email` / `bluesky` — this run's rendition), the **round-1 confirmed gate edits** from both loops for that medium (synthesis's gate-tier consolidated edits — the deduped, false-positive-dropped set is what makes them "confirmed"), and health metrics (outline/draft round counts, final tone score, de-tell passes).

It abstracts each gate edit into a content-agnostic pattern, tallies it across posts in `<config.docsRoot>/content-pipeline/learnings-tally.json`, and — once a pattern recurs on `promoteThreshold` (3) distinct posts — promotes a **context-scoped** entry (never a blanket ban) into the `## Auto-derived pitfalls` section of `<config.docsRoot>/content-pipeline/drafter-pitfalls.md`, so the outline-builder and drafter (Steps 4.5, 5) stop producing it. It's the generation-side mirror of the reviewer ledgers, and it never touches a reviewer or softens a gate. Round-count is a health signal it records, never a target it optimizes. This runs on every post so the queue both feeds and benefits from it.

---

### 12. Build and Commit

**Final safety grep.** The safety scrub + banned-term scan in Steps 4.6/6 cover the outline and draft, but not any summary/digest prose authored in Steps 8–9 or the assembled frontmatter. Immediately before committing, run both checks over the final assembled post file:
```bash
grep -iE "<term1>|<term2>|..." <the-new-post-file>   # one alternative per config.bannedTerms entry
grep -iE "api[_-]?key|secret|token|password" <the-new-post-file>
```
Any match blocks the commit — fix it before proceeding.

Build and commit per the consumer repo's own conventions (its build command, its commit message style, whether it pushes automatically or waits for review). This skill doesn't prescribe a deploy target.

---

## Scheduling (optional)

If the consumer wants a steady publishing cadence rather than one-off posts, `scripts/schedule.ts` can re-slot a future queue instead of hand-picked dates — dry-run for a plan, `--status` for coverage only, `--apply` to re-slot. It treats posts dated today-or-earlier as frozen and only moves future ones. This is entirely optional infrastructure; skip it if the consumer just wants to publish as they go. When multiple mediums are enabled, it re-slots by `blogpost.md`'s `pubDate` — the single date that drives the whole folder's drip (see the Scheduling note under Mediums above).

---

## Content Safety — What NOT to Post

- **No API keys, tokens, secrets, or credentials.** Redact completely if found in source material.
- **No literal occurrence of any `config.bannedTerms` entry** (or an obvious alias) anywhere in content. `synthesis`'s banned-term scan (Steps 4.6 and 6) gates on this.
- **No passwords, private URLs, or internal infrastructure details.**
- **No questionable or potentially embarrassing activity.** Leave out sketchy workarounds, frustrated rants, off-color jokes, accidental data exposure. When in doubt, skip or ask the human owner.
- **No personal information** beyond what's already been made public in prior posts.
- **No unfinished security vulnerabilities.** Don't publish details until the issue is resolved.
- **No sensitive business specifics** — dollar splits, equity percentages, surnames, legal/vesting terms — beyond what the human owner explicitly makes public.

When in doubt: **ask the human owner before publishing sensitive material.**

The `synthesis` agent runs the safety scrub in both review loops (Steps 4.6 and 6) — it's additional coverage, not a substitute for judgment here.
