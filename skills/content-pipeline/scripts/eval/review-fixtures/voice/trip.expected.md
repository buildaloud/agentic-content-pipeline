# Expected: voice-reviewer — trip (draft mode)

**Reviewer:** `voice-reviewer`
**Mode:** draft
**Disposition:** TRIP (gate finding expected — fails all three voice checks)

## Why this must trip

`references/agents/voice-reviewer.md` names three things that must be present;
this fixture fails all three on purpose:

1. **Burstiness** — all four sentences run 15–24 words with the same
   subject-verb-object shape ("The team considered...", "Each approach had...",
   "a decision was made...", "This approach was expected..."). No fragment, no
   short punch, no length variation.
2. **Concrete specifics** — zero named tools, numbers, costs, or file paths.
   "several approaches", "its own advantages and tradeoffs", "the option that
   seemed most appropriate" — pure abstraction where real detail belongs.
3. **Flat held opinions** — "The team" (not "I"), passive "a decision was
   made" (agentless), and a view-from-nowhere summary with no stance taken.
   This is a generic, voiceless register — the opposite of the target voice
   defined in the voice file (config.voiceFile).

## What a correct result looks like

```json
{
  "axis": "voice fidelity + human texture",
  "verdict": "fail",
  "gateFindings": [
    {
      "location": "Improving the queue",
      "quote": "The team considered several approaches to improve the system's reliability.",
      "problem": "view-from-nowhere; no named approach, no number, passive framing (\"the team\" not \"I\")",
      "fix": "name the specific approaches and who decided, e.g. \"I looked at three ways to make the queue more reliable.\""
    },
    {
      "location": "Improving the queue",
      "quote": "After some consideration, a decision was made to proceed with the option that seemed most appropriate for the situation.",
      "problem": "agentless passive voice, no stated opinion, no specifics on what was chosen or why",
      "fix": "state who decided and what, as a held opinion: \"I killed the queue — the CDN's retries do the job.\""
    }
  ]
}
```
