## Why the board is read-only

We shipped the ticket board with zero write endpoints. Nobody, not even the
project owner, can quietly edit the ticket history behind the AI's back. I
wanted the audit trail untouchable, so I cut write access entirely instead
of gating it.
