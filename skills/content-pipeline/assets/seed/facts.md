# Facts — fact-checker memory

The `fact-checker` agent owns this file. It reads it before every check and
updates it after: facts it verifies, corrections it makes, external claims it
confirms against a source. Keep it tidy — correct an entry rather than
duplicating it. These are your project's own facts (the expensive-to-get-wrong
ones) plus a running record of verified external claims.

## Our projects / tools (get these right)

<!-- One entry per project/tool your posts reference. Name, what it does,
     what it is NOT, common confusions. -->

## Verified external claims

<!-- Claims about third-party tools, research, or history that the
     fact-checker has confirmed against a source. -->

## Keep this file lean

The `fact-checker` reads this file in full on every dispatch — up to 10x per
post — so its size is a per-post token tax. Correct entries in place rather
than appending near-duplicates, prune entries later corrections supersede,
and once the file passes ~200 lines run a manual summarization pass: collapse
resolved entries into a single one-line precedent each.
