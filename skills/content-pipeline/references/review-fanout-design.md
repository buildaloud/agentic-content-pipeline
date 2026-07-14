# Document Review Fan-Out — Design

**Status:** approved for build (2026-07-12)
**Scope:** a per-post review army for the content pipeline — an outline step,
two adversarial review loops (outline, then draft), and a learning meta-reviewer.

## Goal

Replace the pipeline's few-generalist review layer with an *army* of narrow,
single-axis reviewers that run as a fan-out, mirror a review→fix→re-review
fixpoint, and push every post past "good enough" —
constructively, not just pass/fail. Add an **outline** artifact that is itself
reviewed before drafting, so structural problems are caught in the plan (cheap)
rather than in the prose (expensive). The outline's per-beat guidance becomes the
rubric the draft is graded against.

## Why now

- The tool built to catch flat/empty prose (`skills/human-tone/scripts/eval/judge.ts`)
  exists but is **not wired into the gate** — `run.ts` only calls the regex
  `scoreText`. Empty formulaic sentences pass today.
- The current reviewers are generalists (`content-reviewer` does voice+SEO+marketing
  at once); no lens goes deep.
- No mechanism learns from what actually ranks + gets liked.

## Architecture

```
Brief (SEO + editorial contract, unchanged)
   ↓
OUTLINE            ← new artifact: guidance-rich, per-paragraph blueprint
   ↓
◆ OUTLINE review loop   fan-out → synthesize → edit → re-review  (cap 5, gate=0)
   ↓  (passes autonomously → drafting; no human gate)
DRAFT              ← written to the approved outline
   ↓
◆ DRAFT review loop     fan-out → synthesize → edit → re-review  (cap 5, gate=0)
   ↓  (draft reviewers grade the prose AGAINST the outline's per-beat guidance)
Assemble → hero image → summary/digest → commit  (unchanged)
```

Each ◆ loop: dispatch the whole army in parallel on the current artifact →
`synthesis` agent dedups + ranks findings + arbitrates done → a single editor
applies fixes (one hand on the pen) → re-run the army. Repeat until zero **gate**
findings remain or 5 rounds elapse, then surface to the human owner. Only gate findings gate;
**elevations** (see below) are applied opportunistically within the cap and never
block convergence.

## The outline artifact (`<slug>.outline.md`)

YAML. A flexible top-level **meta block** (variable per post) + an ordered list of
paragraph nodes.

```yaml
# meta — required fields present on every post; posts may add/drop others
point: "the single thing this post makes the reader believe/do"
hook: "the opening promise, specific"
emotionalCore: "the feeling the post is trying to land"
flare: "the memorable move — the line, the reveal, the format twist"
targetAudience: "..."
targetKeyword: "..."   # carried from Brief
searchIntent: "..."    # carried from Brief
postFormula: "named shape from references/post-formulas.md (or a declared novel shape)"

paragraphs:
  - order: 1
    topic: "what this beat is about"
    goal: "hook | proof | turn | payoff | context | CTA"
    paragraphFormula: "named shape from references/paragraph-formulas.md"
    audienceNote: "who this beat speaks to / what they need here"
    intendedBeat: "the emotional/impact intent (the aha, the gut-punch, the reassurance)"
    ourTake: "the opinion the writer holds here — a real argument, not view-from-nowhere"
    facts: ["concrete claim + number"]
    sources: ["https://…"]        # every factual beat MUST carry a source
    keyword: "target/secondary keyword this beat carries, or none"
    links: ["internal (the project's link-map ledger) or external citation to place here"]
    gateGuidance: "per-reviewer hints: what seo/emotion/flatness/etc. should check HERE"
    rendersAsProse: true          # false = guidance-only, informs writing but not shown
```

`gateGuidance` + `rendersAsProse` are the "guidance for all the gates" — the
outline tells each reviewer what to look for per beat instead of guessing intent.

## The review army (~15 lenses)

Each is a memory-light Sonnet agent, `effort: high`, modeled on
`references/agents/impact-reviewer.md`. Two run modes: **outline** and
**draft** (some run in both, some draft-only). Every agent returns the shared
adversarial finding schema.

| # | agent | axis | outline | draft | disposition |
|---|-------|------|:---:|:---:|---|
| 1 | `hook-reviewer` | title + opener earns the read, specific promise | ✓ | ✓ | gate(advisory) |
| 2 | `impact-reviewer` | every beat earns its place / not filler *(← section-impact)* | ✓ | ✓ | advisory |
| 3 | `emotion-reviewer` | stakes, a line that lands, not "competent but dead" | ✓ | ✓ | advisory |
| 4 | `flatness-reviewer` | sentence-grain empties, no-idea sentences | ✓ | ✓ | **gate** |
| 5 | `formulaic-reviewer` | AI crutches: neg-parallelism, rule-of-three, tidy bows | ✓ | ✓ | **gate** |
| 6 | `voice-reviewer` | configured voice + human texture (burstiness, specifics, flat opinions) | ✓ | ✓ | **gate** |
| 7 | `structure-reviewer` | sentence rhythm/variety, run-ons, awkward constructions | | ✓ | auto-apply |
| 8 | `wordsmith-reviewer` | weak verbs, adjective-crutches, clichés, sharper words | | ✓ | auto-apply |
| 9 | `grammar-reviewer` | grammar, punctuation, typos | | ✓ | auto-apply |
| 10 | `seo-reviewer` | keyword usage, title/meta length, headings, intent match | ✓ | ✓ | advisory |
| 11 | `link-integrity-reviewer` | links resolve + right target *(← link-checker)* | | ✓ | **gate** |
| 12 | `link-opportunity-reviewer` | missing internal links (the editorial rules) + needed citations | ✓ | ✓ | advisory |
| 13 | `fact-checker` | claims trace to a live source *(schema-migrated)* | ✓ | ✓ | **gate** |
| 14 | `bullshit-detector` | technical claims honest, sources understood *(schema-migrated)* | ✓ | ✓ | **gate** |
| 15 | `meta-content-reviewer` | learned "what wins" (SEO rank + likes) vs this post | ✓ | ✓ | advisory |
| — | `outline-structure-reviewer` | whole-shape coherence, type-appropriate, non-rigid | ✓ | | **gate** |

"gate(advisory)" for hook = advisory unless the hook is missing/broken, then gate.

## Adversarial-constructive finding schema

Every finding — gate or elevation — is an **apply-ready edit**, not a description
of a problem. It quotes the exact current text and hands over the literal
replacement, so the editor applies `quote → replacement` mechanically:

```ts
type Edit = {
  location: string,   // section/heading/beat the edit lands in
  quote: string,      // EXACT current text, verbatim (the find-target)
  problem: string,    // one short clause — WHY; not a paragraph
  editType: "replace" | "delete" | "insert-after",
  replacement: string,// APPLY-READY literal text to paste (empty for delete).
                      // NEVER a description ("this is negative parallelism") —
                      // the actual words: "replace THIS with THAT" / "delete this".
}
{
  axis: string,
  verdict: "pass" | "needs-work" | "fail",
  gateFindings: Edit[],   // drive the loop — ONLY a gate-disposition axis may populate this
  elevations:   Edit[],   // "for your consideration" — never gate
}
```

**Disposition routes the lane, not the reviewer's self-labeling.** A reviewer whose
axis is `advisory` or `auto-apply` (per `lib/review-disposition.ts`) leaves
`gateFindings` EMPTY and puts everything in `elevations` — polish must not
masquerade as a blocker. Only gate-disposition axes populate `gateFindings`.

Reviewers *always* offer at least one elevation even on a passing beat — "it
delivers, but it's tighter as X." Gate findings loop; elevations are best-effort
within the round cap. Because findings are apply-ready, synthesis forwards each
edit's `quote`/`editType`/`replacement` to the editor verbatim — it never
collapses them back into prose the editor then has to re-interpret.

## Coordination

- **`synthesis` agent** *(= repurposed `content-reviewer`)* — dedups overlapping
  findings across the army, ranks by severity, resolves conflicts (so two agents
  don't rewrite the same sentence), and decides "done" (zero gate findings) or
  "another round." Owns the round cap.
- **editor** — one agent applies the synthesized edit set (the drafter revision
  loop), so a single hand holds the pen. Auto-apply axes (grammar/wordsmith/
  structure) may be applied directly; gate fixes always applied.

## The learner — `meta-content-reviewer`

Memory-backed (read-first / update-last, ledger under
`.claude/agent-memory/meta-content-reviewer/`).

- **Ingests performance:** SEO rank/clicks/impressions per post, plus any
  other engagement metric the project tracks (e.g. reactions, shares), from
  wherever the project stores structured stats data.
- **Learns:** the meta-content signature of winners — which hooks, points,
  emotional beats, and shapes correlate with rank + engagement over time.
  Updates its memory when new stats land.
- **Reviews:** new outlines/posts against the learned pattern ("winners open
  harder than this; your point is thinner than the top-5").

## Wiring into the content-pipeline skill

- New **Step 4.5 — Outline**: expand `Brief.outline[]` into the outline artifact.
- New **Step 4.6 — Outline review loop** (◆), auto-proceeds on pass.
- **Step 5 — Draft** writes to the approved outline (unchanged agent, new input).
- **Step 6/7 replaced** by the **Draft review loop** (◆): the army + synthesis +
  editor fixpoint. Retire generalist `content-reviewer` (→ becomes `synthesis`);
  `section-impact-reviewer` → `impact-reviewer`; `link-checker` → `link-integrity-reviewer`.
- **Wire `judge.ts` in** as the backing signal for emotion/flatness/formulaic
  (finally gated, not eval-only).

## Reuse / new / retire

- **Reuse:** `fact-checker`, `bullshit-detector`, `judge.ts`, `references/post-formulas.md`,
  `references/paragraph-formulas.md`, the project's link-map ledger.
- **Repurpose:** `content-reviewer` → `synthesis`; `section-impact-reviewer` →
  `impact-reviewer`; `link-checker` → `link-integrity-reviewer`.
- **New:** hook, emotion, flatness, formulaic, voice, structure, wordsmith, grammar,
  seo, link-opportunity, meta-content, outline-structure reviewers; the outline
  artifact + schema; the fan-out loop.
- **Note:** `content-judge` (brief-stage advisory judge,
  `references/agents/content-judge.md`) already has a `weak-hook` check that
  pre-dates and overlaps with the new `hook-reviewer` axis — not reconciled
  here, flagged for a future cleanup. The reviewer fixture harness (one file
  per reviewer: a beat that should trip it + a clean beat that shouldn't) now
  lives at `scripts/eval/review-fixtures/`.

## Runs as

An **LLM-followed protocol**, encoded as steps in the content-pipeline SKILL
(`SKILL.md` Steps 4.5/4.6/6) — not a workflow
engine. Nothing enforces parallelism or a concurrency cap at runtime; the
orchestrating agent dispatches the fan-out in practical batches via the Agent
tool. What IS mechanically enforced:
- **Convergence + disposition** — `scripts/lib/review-disposition.ts`'s
  `classifyDisposition` and `isConverged`, not prose judgment.
- **The tone gate** — `tone-grader.ts`'s `scoreText` (`banned` / `aiScore`), a
  hard code check with zero LLM discretion.
- **The round cap (5)** — enforced by the loop's own round counting.

## Testing

- Each reviewer gets a fixture: a beat that should trip it + a clean beat that
  shouldn't (guards false positives).
- The em-dash "Punctuation is decoration" passage is the golden fixture for
  `flatness-reviewer` — it must fire on the back half, pass the concrete front.
- `isConverged` and `classifyDisposition` (`scripts/lib/
  review-disposition.ts`) are unit-tested in the sibling `.test.ts` — including
  a round-sequence simulation that drives `isConverged` across a mock round 1
  (gate findings open) → round 2 (findings cleared, safety + banned clear)
  transition, proving the predicate flips correctly across rounds.
- Per-reviewer fixtures live at `scripts/eval/review-fixtures/` — a manual drift-check
  today, no CI runner wired up yet.
- **Known gaps, tracked as follow-up:** no full multi-round LLM loop-integration
  test (a deliberately-flat draft actually converging to clean end-to-end); no
  CI fixture runner over `scripts/eval/review-fixtures/`; no fully-mechanical cold-start
  precompute. These are gaps by the nature of the design, not oversights — the
  loop itself is an LLM-followed protocol (see "Runs as" above), not a code
  engine, so its end-to-end behavior isn't unit-testable the way the pure
  predicates above are.

## Risks / open

- **Cost/latency:** ~15 agents × 2 loops × ≤5 rounds per post. Mitigate with the
  outline pass catching structure early (fewer draft rounds); there is no
  concurrency cap to lean on — batches are dispatched at the orchestrator's
  discretion.
- **Elevation churn:** elevations must not oscillate the text; the editor applies
  only clearly-better ones, and gate-findings alone define convergence.
- **Learner cold-start:** until enough posts have rank+like data, `meta-content-reviewer`
  runs advisory-only with low confidence and says so.
