# Detector layers — research + status (2026-07-04)

The humanizer stack, in order of cost:

1. **tone-grader.ts** (live) — deterministic tells: formal-AI lexicon,
   quip-tics, adverb inflation, tricolons, em-dash density, the reading tells
   below, and in human mode the corpus-relative texture (contractions/100w,
   sentence-opener diversity, burstiness). See Modes.
   Ship gate: aiScore < 15 (human corpus ≈ 2, published posts 0-12 under the old weights).
2. **judge.ts** (live) — Gemini 2.5 Flash, temp 0, rubric-scored (rhythm,
   tics incl. view-from-nowhere + fake hedging, specificity, voice, effort
   asymmetry). Quotes worst lines with rewrites. `npm run judge <post>`.
3. **desklib/ai-text-detector-v1.01** (documented here for reimplementation
   only — the script that ran it was removed from this package: it pulled in
   `torch` + `transformers`, an undocumented, heavy dependency this skill
   doesn't otherwise need, and it was advisory-only). If you want it back:
   supervised DeBERTa classifier, calibrated here on a private Slack corpus at
   0.03, deliberate AI slop at 1.00, shipped posts 0.25-0.37; score in
   ~500-word chunks and report mean + worst chunk. Advisory canary, never a
   gate — it flags chunks the other layers pass.
4. **Fast-DetectGPT** (NOT installed — needs a yes: repo +
   GPT-Neo-2.7B, ~5GB). Perplexity-curvature score. Important caveat from
   Liang 2023 (arXiv 2304.02819): perplexity methods measure prose
   UNIFORMITY, not authorship (61% false-positive on non-native TOEFL
   essays). For self-grading that's the feature: read it as "how
   predictable is this prose."

Skipped deliberately: Binoculars (two 7B models for marginal gain at our
false-positive tolerance), commercial APIs (GPTZero/Sapling/Originality —
none $0 at per-draft volume).

Sources: huggingface.co/desklib/ai-text-detector-v1.01 ·
github.com/baoguangsheng/fast-detect-gpt · github.com/liamdugan/raid ·
arxiv.org/abs/2405.07940 · arxiv.org/abs/2304.02819

## Modes

`scoreText(text, { mode })` weighs the hits by `WEIGHTS[mode]` in tone-grader.ts. One check also differs by mode: the abstract-opener subject (see abstractOpeners). Human mode's subject matches everything plain mode's does, so the rule below holds.

| Signal | plain (default) | human |
|---|---|---|
| Reading tells (hedges, signposts, AI vocabulary, negative parallelism, narrator voice, abstract openers, verdict closers, sales talk and the rest) | full weight | full weight |
| Long sentences (prose over 25 words) | 2 per hit, cap 10 | 2 per hit, cap 10 |
| Em-dash, rule-of-three, punch fragments | about a quarter of the human cap | full weight |
| Low burstiness, few contractions, repeated sentence starts | off | on |

Human mode never scores a text lower than plain mode.

## narratorVoice

The writer talks about their own document ("the part worth repeating", "as noted above", "belongs here") or writes a sentence whose only job is to announce the next one ("That work then met a real customer"). Weight 6, cap 24. "worth noting" is left to the hedge list, so the phrase counts once.

Fix by deleting the sentence.

## abstractOpeners

A paragraph about a person opens by characterizing them in habitual present tense rather than reporting a specific event. Narrow by design: a person as subject, then a present verb ending in a single s that is not a copula, auxiliary or function word ("Use this"), and not followed by a time word ("Twenty minutes later..." is fine). Weight 7, cap 28: the tell a human reader rejects first.

The subject differs by mode. Plain mode counts only He or She, because in docs a capitalized subject is usually a tool or an imperative ("Claude owns", "Composition runs"). Human mode also counts a capitalized name that is not a sentence-start function word, so "Marcus checks his own numbers" counts there; a product name ("Codex runs headless") is a known false positive in human mode.

Fix by opening in past tense on a specific occasion.

## verdictClosers

A paragraph of 2 or more sentences ends on "That/This/Which/It is..." plus an evaluative word ("the right", "the whole", "worth", "precisely", "rather than"). The evidence already made the point; the closer restates it. Weight 4, cap 16.

Fix by deleting the sentence.

## longSentences

A prose sentence over 25 words, the STE100 guidance for a description (about 20 for an instruction). Code blocks, tables, headings, list items and quotes are skipped. Weight 2, cap 10, in both modes.

Fix by splitting it, one idea per sentence.
