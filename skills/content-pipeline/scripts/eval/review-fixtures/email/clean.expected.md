# Expected: email-reviewer — clean (draft mode)

**Reviewer:** `email-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same incident (a broken build), same general topic as `trip.draft.md`, but
hits both of email-reviewer's checks:

1. **Subject within cap** — `subject: "Our build pipeline broke — here's the
   fix."` is 42 characters against the 50-char cap. Verified mechanically:
   `frontmatter.subject.length === 42`.
2. **Concrete, not clickbait** — names the actual thing ("build pipeline
   broke") and the actual promise ("here's the fix"), no vague tease.
3. **Single CTA** — the body has exactly one ask: "Read the full postmortem:
   <link>." No competing second ask.
4. **Preheader within cap** — 55 characters against the 90-char cap, and it
   extends the promise (root cause) rather than repeating the subject
   verbatim.

This is the false-positive guard: an email-reviewer prompt that flags a
short, concrete, single-CTA email as broken (because it links out or names a
technical cause) is over-firing.

## What a correct result looks like

```json
{
  "axis": "medium-fit for email",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "body",
      "quote": "We fixed it by scoping the cache key to the lockfile hash instead of the branch name.",
      "betterBecause": "true but could quantify the before/after fix time for an even sharper claim",
      "rewrite": "We fixed it by scoping the cache key to the lockfile hash — builds have been green for two weeks since."
    }
  ]
}
```
