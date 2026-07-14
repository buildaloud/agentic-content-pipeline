🧵 1/7 — a must-read thread on why your team's release process is probably **broken** and nobody has told you yet: we spent three months debugging a deploy pipeline that turned out to have a review step nobody could explain, a cache key that never invalidated, and a rollback script that had been silently broken since March, and here's everything we found.

---

The cache key was pinned to the branch name instead of the lockfile hash, so every merge to main reused a stale dependency snapshot from whenever the branch was first created.
