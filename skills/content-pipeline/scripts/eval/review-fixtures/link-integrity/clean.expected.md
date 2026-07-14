# Expected: link-integrity-reviewer — clean (draft mode)

**Reviewer:** `link-integrity-reviewer`
**Mode:** draft
**Disposition:** CLEAN (no gate finding expected)

## Why this must stay clean

Same beat, same link text, correct target: `issue-tracker-cli` points at
`https://github.com/example-org/issue-tracker-cli`, the canonical URL in
`docs/content-pipeline/link-map.md`. The link resolves (public GitHub repo) AND points at
the right place (the plugin's actual home, not the audited-skill marketplace
it isn't listed on). This is the false-positive guard: a
link-integrity-reviewer prompt that flags any GitHub link, or any link
matching a known-brand marketplace domain by pattern rather than checking the map, is
over-firing.

## What a correct result looks like

```json
{
  "axis": "link resolves + points at the right place",
  "verdict": "pass",
  "gateFindings": [],
  "elevations": [
    {
      "location": "Try it yourself",
      "quote": "[issue-tracker-cli](https://github.com/example-org/issue-tracker-cli)",
      "betterBecause": "correct, but the anchor text could name the install command for a slightly more actionable CTA",
      "rewrite": "[install issue-tracker-cli](https://github.com/example-org/issue-tracker-cli)"
    }
  ]
}
```
