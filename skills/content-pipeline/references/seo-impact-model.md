# SEO impact & scheduling model

An optional model for deciding **what publishes when**. If you use it, every
post is scored and placed by this model, and the model is re-tuned as you
learn. Adopt it as-is or treat it as a starting point for your own scoring
rubric.

## The two buckets

Posts split by *whose work they're about*, because freshness matters for one and
not the other:

- **Bucket A — the owner's own work** (anything the site owner built/decided/
  learned; today's changes). **Always front-loaded**, ordered by recency. It's
  time-sensitive: a build-in-public post about what shipped today loses value
  every day it waits. These take the earliest open slots, ahead of Bucket B.
- **Bucket B — the evergreen pool** (other people's work AND any not-yet-published
  evergreen / inspiration / learning / how-to post). **No freshness clock — a
  scored priority pool, drained highest-SEO-first** (score below).

**The schedule is not fixed dates — it's a daily draw.** Each publishing slot
takes the newest ready Bucket A post if there is one; **otherwise it pulls the
top-scored post from the Bucket B pool.** So on any day the owner ships fresh
work, it front-loads; on any day they don't, the best evergreen backfills — the
cadence never stalls and the highest-impact evergreen always surfaces first.
Low-scoring Bucket B posts are the long tail that sinks to fill future gaps.

Crucially, **the entire unpublished evergreen backlog is in the pool** — including
posts already sitting on future calendar dates. Those dates are provisional; a
post keeps its slot only until a higher-priority post (fresh Bucket A, or a
higher-scored Bucket B) claims it. Re-score and re-draw on every publish / commit
/ deploy.

Edge call: a post that's *the owner's lived experience of an external thing*
(exploring a new tool, a chat with another model) is **Bucket A** — the spine
is the owner's own work, the external thing is the occasion.

## SEO impact score (Bucket B ranking; also informs Bucket A tie-breaks)

Score 0–100, weighted sum of four factors. Weights are the tunable part.

| Factor | What it measures | Signal source | Weight (v1) |
|---|---|---|---|
| `intentValue` | Does the target keyword's intent convert to a reader who wants what we publish? Informational-how-to and "real experience" queries score high; pure tool-comparison/commercial we can't satisfy in a narrative scores low. | seo-researcher `searchIntent` + keyword | 0.30 |
| `opportunity` | Volume × ownability — is there real demand AND can we rank (SERP is weak / we have E-E-A-T the incumbents lack)? | seo-researcher `KeywordOpportunitySet` (volume band, competition, cannibalization flag) | 0.30 |
| `engagement` | Shareability / hook strength — will it get read, linked, and returned to? | content-judge hook rating + intuition | 0.20 |
| `freshness` | Timeliness of the hook (a wave we can ride now). Bucket A is auto-max here; Bucket B external news decays. | pubDate vs source date + intuition | 0.20 |

`score = 100 * (0.30·intentValue + 0.30·opportunity + 0.20·engagement + 0.20·freshness)`,
each factor normalized 0–1. Record the four sub-scores, not just the total, so we
can see *which factor* mispredicted.

## The learning loop (why it lives in the pipeline)

The model is only as good as its calibration. Every post and every stats pull is
a training signal:

1. **At assemble time** (pipeline Step 10.5) the orchestrator scores the post,
   places it per the two buckets, and appends a **prediction** to
   `<config.docsRoot>/content-pipeline/seo-predictions.json`: the four
   sub-scores, total, bucket, chosen slot, and a one-line rationale.
2. **At the stats-pull step** (or any rebalance) reconcile: join predictions to
   actual `config.statsFile` data (views / impressions / clicks / position for
   that slug), compute the gap, and note which factor was off (e.g.
   "opportunity over-weighted — ranked but no volume").
3. **Re-tune**: nudge the weights / factor rubrics from the reconciliation, plus
   any new keyword research and plain intuition. Bump the `modelVersion` in the
   ledger and write one line on what changed and why. This is human+AI in the
   loop, not automated regression — small, explainable adjustments.
4. **Rebalance** the remaining queue with the updated model whenever we publish,
   commit, or deploy content changes.

Ledger shape (`<config.docsRoot>/content-pipeline/seo-predictions.json`):

```json
{
  "modelVersion": "v1",
  "history": [{ "version": "v1", "date": "2026-07-11", "change": "initial weights 30/30/20/20" }],
  "predictions": [
    { "slug": "...", "bucket": "A|B", "pubDate": "...", "score": 0,
      "factors": { "intentValue": 0, "opportunity": 0, "engagement": 0, "freshness": 0 },
      "rationale": "...", "actual": null }
  ]
}
```

`actual` is backfilled at reconciliation: `{ "views": n, "impressions": n, "clicks": n, "position": n, "asOf": "..." }`.

## Honest limits

Scores are judgment encoded as numbers, not ground truth — until enough
predictions have `actual` filled in, treat ranks as informed guesses. The point
isn't precision; it's a **consistent, improvable** way to decide order, and a
record we can look back on to see whether our instincts about impact were right.
