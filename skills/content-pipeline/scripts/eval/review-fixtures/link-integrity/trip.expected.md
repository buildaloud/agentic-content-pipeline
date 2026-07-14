# Expected: link-integrity-reviewer — trip (draft mode)

**Reviewer:** `link-integrity-reviewer`
**Mode:** draft (this reviewer is draft-only; no outline mode)
**Disposition:** TRIP (gate finding expected — wrong-target link)

## Why this must trip

`issue-tracker-cli` is linked to `https://marketplace.example.com`. Per this
reviewer's own memory file, `docs/content-pipeline/link-map.md`:

> **issue-tracker-cli** | `https://github.com/example-org/issue-tracker-cli` | Public
> plugin. Landing page: `https://issue-tracker-cli.example.dev`. **NOT a
> marketplace listing.**

and, in the drift patterns section:

> A `*-cli` plugin linked to `marketplace.example.com` → wrong; use its
> GitHub repo.

This is the **named, documented "known error"** — the link resolves (so a
mechanical `curl` check alone would pass it) but points at the wrong target:
`marketplace.example.com` is the audited *third-party skill catalog*;
issue-tracker-cli is a plugin the reader installs from GitHub, not
something listed there. This is exactly the class of defect
`link-integrity-reviewer` exists to catch that `scripts/check-links.ts`
cannot (reachability ≠ correctness).

## What a correct result looks like

```json
{
  "axis": "link resolves + points at the right place",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "Try it yourself",
      "quote": "[issue-tracker-cli](https://marketplace.example.com)",
      "problem": "wrong target — issue-tracker-cli is a GitHub-installed plugin, not a marketplace.example.com listing (documented drift pattern in docs/content-pipeline/link-map.md)",
      "fix": "point at https://github.com/example-org/issue-tracker-cli"
    }
  ]
}
```
