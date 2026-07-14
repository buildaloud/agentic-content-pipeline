# Expected: email-reviewer — trip (draft mode)

**Reviewer:** `email-reviewer`
**Mode:** draft
**Disposition:** TRIP (gate finding expected)

## Why this must trip

`references/agents/email-reviewer.md` names hard-gate checks on subject
length and CTA count; this fixture fails both on purpose:

1. **Subject line over cap** — `subject: "You Won't Believe What Broke Our
   Build At 2AM Last Night — Click Now!!"` is 70 characters against the
   `references/email-formulas.md` 50-char hard cap. Verified mechanically:
   `frontmatter.subject.length === 70`.
2. **Clickbait phrasing** — "You Won't Believe" is a vague tease with no
   concrete noun for what actually broke, the exact pattern
   `email-formulas.md`'s Format facts calls out ("never clickbait").
3. **Three competing CTAs** — the body asks the reader to (a) "Click here to
   read the full story", (b) "reply and tell us what you think", and (c)
   "sign up for the follow-up webinar" — three distinct imperative asks in
   one short body. Hard-gate per the reviewer's "Single CTA" check.

The preheader (35 chars) and body length stay within their own caps so this
fixture isolates the subject + CTA defects rather than compounding them with
unrelated findings.

## What a correct result looks like

```json
{
  "axis": "medium-fit for email",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "subject",
      "quote": "You Won't Believe What Broke Our Build At 2AM Last Night — Click Now!!",
      "problem": "70 characters, exceeds the 50-char cap; vague clickbait tease with no concrete noun",
      "fix": "name the actual thing, e.g. \"Our build pipeline broke — here's the fix.\" (42 chars)"
    },
    {
      "location": "body",
      "quote": "Click here to read the full story on our blog, then reply and tell us what you think, and don't forget to sign up for the follow-up webinar",
      "problem": "three competing CTAs (read, reply, sign up) — the reader does none of them",
      "fix": "keep one ask, e.g. \"Read the full postmortem: <link>\", cut the other two"
    }
  ],
  "elevations": []
}
```
