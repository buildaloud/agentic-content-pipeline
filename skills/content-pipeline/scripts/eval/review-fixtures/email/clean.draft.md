---
subject: "Our build pipeline broke — here's the fix."
preheader: "Root cause was a stale cache key, not the deploy script"
---

Our build pipeline failed three times overnight. The cause: a stale cache key that pinned an old dependency version.

We fixed it by scoping the cache key to the lockfile hash instead of the branch name.

Read the full postmortem: https://example-eng.example.com/build-postmortem
