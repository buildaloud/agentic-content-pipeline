# Post Formulas

Named structures for build-in-public posts. The `brief-writer` picks one per post
(`postFormula` in the Brief); the outline follows its beats;
`outline-structure-reviewer` (outline grain) and `impact-reviewer` (draft
grain, formerly `section-impact-reviewer`) check the shape actually holds.

Pick by what the post *is*, not by habit. Most build-in-public posts are build-log
war stories or how-I-built-X — reach for others deliberately.

---

## war-story
A thing broke, you dug, you found the real cause, you fixed it. The tension is
the mystery.
- **Hook** — the symptom, stated plainly and specifically ("my like button 404'd
  in prod but worked everywhere else").
- **False leads** — what you thought it was, why that was wrong (earns the reveal).
- **The reveal** — the actual root cause, named clearly.
- **The fix** — what you changed, concretely.
- **The lesson** — one honest takeaway, no moral-of-the-story bow.
- Best when: a real debugging arc with a non-obvious cause.

## how-i-built-x
You built a thing; here's how it works and the decisions behind it.
- **Hook** — what it does + the one interesting constraint ("dual-ship: one MCP
  marketplace for Codex *and* Claude").
- **The shape** — the architecture in the fewest moving parts that explain it.
- **The decisions** — 2–3 real forks and why you went the way you did (name the
  road not taken).
- **What bit you** — the gotcha a reader building this would hit.
- **Use it** — how the reader can do the same thing.
- Best when: a shipped thing with real decisions worth showing.

## teardown
Examine someone else's thing (tool, claim, launch) and say what's actually true.
- **Hook** — the claim or artifact under examination.
- **What it gets right** — steelman first; earns your critique.
- **Where it breaks** — the specific gap, with evidence.
- **What you'd do** — your take, grounded in having built adjacent things.
- Best when: an SEO-worthy external topic where we have real standing to judge.

## contrarian-take
The common wisdom is X; from what you've actually built, it's more like Y.
- **Hook** — state the common wisdom flatly, then undercut it in one line.
- **Why people believe it** — fair, not strawman.
- **What you saw instead** — your evidence from real work.
- **The nuance** — when the common wisdom *is* right (keeps you honest).
- Best when: you have first-hand evidence against a popular belief. Never contrarian for clicks.

## decision-log
You faced a fork, weighed it in public, and chose. The value is the reasoning.
- **Hook** — the decision + the stakes.
- **The options** — 2–3, each with its real cost.
- **The call** — what you picked and the deciding factor.
- **Revisit** — what would change your mind later.
- Best when: a genuine judgment call others face too (stack choice, build-vs-buy).

---

## Rules for every formula
- The hook is the first line, concrete and specific — never a warm-up paragraph.
- Every section has one job (see `paragraph-formulas.md`); cut any that doesn't.
- End with a bulleted **Sources** footer.
- Formula is a skeleton, not a cage — break a beat when the material demands it,
  but know you're breaking it.
