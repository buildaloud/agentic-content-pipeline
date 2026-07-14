# Stats File Schema

`config.statsFile` (optional) points at a JSON file with real per-post
performance data. It's read by Step 10.5's learning loop and by
`meta-content-reviewer` to judge outlines/drafts against what actually won.
Leave `config.statsFile` empty and none of this applies — those features
degrade gracefully without it.

## Shape

```json
{
  "postStats": {
    "byPost": [
      {
        "slug": "how-i-automate-blog-writing",
        "clicks": 42,
        "impressions": 1300,
        "ctr": 0.032,
        "position": 8.4,
        "pageviews": 210,
        "likes": 6
      }
    ]
  }
}
```

## Fields

All fields except `slug` are optional — supply whatever your analytics
source actually gives you.

- `slug` — required. Must match the post's filename slug in `config.contentDir`.
- `clicks` — search-console clicks, if you track them.
- `impressions` — search-console impressions.
- `ctr` — click-through rate (0-1, not a percentage).
- `position` — average search position.
- `pageviews` — site-analytics pageviews.
- `likes` — any engagement/reaction count your site tracks.

Consumers with only some of these signals (e.g. pageviews but no search
console data) should just omit the fields they don't have — partial entries
are expected, not an error.
