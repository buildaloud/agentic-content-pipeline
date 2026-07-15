# Drafter & outline pitfalls — start closer to the finish line

The generation-side mirror of the reviewer ledgers. These are the flags the
review army raises **over and over** on fresh drafts/outlines — pre-empt them
here and the loop converges in fewer rounds. Read this before writing.

**Rules of the road:** every entry is **context-scoped, not a blanket ban** —
the point is to stop the *lazy default*, never to flatten voice. Voice is the
product; a draft that dodges every flag by going bland has failed differently.
When a construction below is a deliberate, load-bearing choice (see the flare
exemption), use it on purpose — just don't reach for it by reflex.

Curated by hand from the cross-run analysis of the review army (2026-07-13).
Later this file is auto-appended from confirmed recurring gate findings.

## 0. Permabanned phrases — hard fail, no exceptions, no context-scoping
The universal AI-crutch permabans below PLUS every term in `config.bannedTerms`.
Any form of "that's the whole point" / "that is the whole point" / "which is the
whole point" (the tone-grader's BANNED list). One hit adds 100 points and
hard-fails the draft. This is the ONE blanket-ban category in this file.
Editors: these have been RE-INTRODUCED while applying content edits — check your
own replacement text before returning it.

## 1. Negative parallelism — the #1 recurring flag, by a wide margin
The "X, not Y" / "isn't X, it's Y" / "not just X, but Y" negate-then-reframe.
- **State Y directly; cut the X contrast.** "The gate is deterministic code" —
  not "the gate isn't a model, it's deterministic code."
- **Never open a beat with it**, and keep it out of an outline's `point`,
  `ourTake`, and `gateGuidance` fields — the drafter renders those near-verbatim,
  so a crutch in the plan becomes a crutch in every draft.
- **Exemption:** the outline's one designated `flare` line may use it on purpose.
  That's protected voice, not a crutch. One line, not a blanket pass.

## 2. Rule-of-three tricolons ("A, B, and C")
Three parallel items where the sentence carries one idea, *and* real lists
written as tidy triads. The editor especially re-introduces these while fixing
other things — watch it.
- When you must list, prefer **two or four** items, or break the parallelism, so
  it doesn't land as rhetorical cadence. Keep the one item that carries weight.

## 3. Overclaims about your own pipeline — ground every claim in `<config.docsRoot>/content-pipeline/facts.md`
A generic example of the pattern: reviewers that read the whole draft but are
each *scoped to grading one axis* are not "blind" to the rest — don't write
"blind to each other" if that's not true of your setup. More generally: state
your pipeline's real thresholds and behavior, not a rounder or more dramatic
number. Don't guarantee behavior of software the post itself says isn't fully
built.

## 4. Future-dated internal links — never
Do not link an internal `/blog/<slug>/` whose `pubDate` is **after** this post's
`pubDate`. This post couldn't have linked a post that didn't exist yet. Link
only already-published targets.

## 5. Hedge reintroduction
"it's worth noting", "worth revisiting", "that said", "arguably", "in many ways".
Assert it flat or cut the sentence. (The army keeps re-proposing these into the
same spans — don't seed them in the first place.)

## 6. Tidy-bow endings
No closing beat that resolves to reassurance / "the future looks bright" / a moral
wrap. End on the sharpest concrete point, or stop when the argument's done.

## 7. The performative register
A real rewrite-queue draft read "too many quips, too much sales speak, trying
too hard, sounds like a bad actor, a bad movie dialogue." The tells:
- **Dramatic-sequencing inversions as hooks** — "X happens before Y" shapes:
  "Twelve stages run before one of these posts ships", "By the time an agent
  writes its first sentence, a dozen reviewers have already…". ONE of these per
  post at most, and only when the sequencing IS the point. Never as a reflex
  opener.
- **Punch-fragment overdose** — "Not even for me." "Go look." "One lane."
  "Wrong lever." A fragment lands because it's rare. More than 2-3 per post
  reads like an action-movie trailer. Prefer complete, calm sentences.
- **Sales speak** — turbocharge, supercharge, game-changing, unlock, "the whole
  thesis", "that's the bet", pitch-deck cadence. State what the thing does.
- **Playing a character instead of talking** — if a line would sound natural
  delivered to a colleague at a desk, keep it. If it needs a movie-trailer
  voice, cut it. Confidence reads as calm, not as punchy.
The register to aim for: someone competent explaining their work plainly, with
occasional dry humor. Not a keynote. Not a trailer. Not a founder pitch.
Deterministic enforcement: the human-tone skill's `scripts/eval/tone-grader.ts`
(installed alongside this skill) scores dramaticInversions (first free, +6 each,
cap 18), punchFragments (first TEN free — burstiness is legitimate voice — then
+1, cap 6), and salesSpeak (+5 each, cap 15). Calibrated so no clean post or
corpus sample newly fails.

## 8. The sales-pivot ending
The closing must resolve the opening — whatever the hook promised, the close
pays off — and its link must point at an implementation or example of *this
article's own subject*, never an unrelated product. "Also check out my other
product/thing" is a sales pivot, not a payoff: it reads like ad copy instead
of helping the reader. Ban it. One CTA max, and it serves the reader's next
step on THIS topic (go see the live thing, clone the repo, run the command) —
not a cross-sell.

## Auto-derived pitfalls
Appended by the content-learner agent once a pattern recurs on ≥3 distinct
posts AND across 2+ mediums (or the pattern is a `blog` pattern — blog is the
reference medium every other one is a variant of). Each carries provenance and
is context-scoped. Audit these periodically — prune any that flatten voice.

<!-- learner appends below this line -->

## LinkedIn-specific pitfalls
Flags that only apply to the LinkedIn rendition — a pattern that has recurred
≥3 times but only ever inside `linkedin.md` drafts/outlines (never generalized
to another medium). Appended by content-learner; see `content-learner.md` step 4.

<!-- learner appends below this line -->

## Email-specific pitfalls
Flags that only apply to the email rendition — a pattern that has recurred ≥3
times but only ever inside `email.md` drafts/outlines (never generalized to
another medium). Appended by content-learner; see `content-learner.md` step 4.

<!-- learner appends below this line -->

## Bluesky-specific pitfalls
Flags that only apply to the Bluesky rendition — a pattern that has recurred
≥3 times but only ever inside `bluesky.md` drafts/outlines (never generalized
to another medium). Appended by content-learner; see `content-learner.md` step 4.

<!-- learner appends below this line -->

