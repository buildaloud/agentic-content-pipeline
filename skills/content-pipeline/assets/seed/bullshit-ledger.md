# Bullshit ledger

Memory for the `bullshit-detector` agent. It reads this first and writes back
after each run. This is the running record of overclaim patterns it has
caught, the honest framing each should use, and sources it has misread.

**How to use:** before checking a post, read the patterns below and apply
them. After checking, add any new overclaim + its honest reframe (correct an
existing entry rather than duplicating).

---

## Overclaim patterns (mechanism → honest framing)

<!-- One entry per recurring overclaim: what the pipeline/product actually
     does, the exaggerated framing that keeps slipping in, the honest
     rewrite. -->

## Keep this file lean

The `bullshit-detector` reads this file in full on every dispatch — up to
10x per post — so its size is a per-post token tax. Correct entries in place
rather than appending near-duplicates, prune patterns later findings
supersede, and once the file passes ~200 lines run a manual summarization
pass: collapse resolved entries into a single one-line precedent each.
