We spent three months debugging a deploy pipeline that turned out to have a stale cache key. Root cause: it was pinned to the branch name instead of the lockfile hash.

---

Every merge to main reused whatever dependency snapshot existed when the branch was first created — sometimes weeks stale.

---

Fix: scope the cache key to the lockfile hash. Builds have been green for two weeks since.
