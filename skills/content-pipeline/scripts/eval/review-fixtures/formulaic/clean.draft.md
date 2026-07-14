## Why the like counter shipped so fast

The like counter took an afternoon: one managed-database table, one edge function, no
queue. It's held up in prod for three weeks without a single 500, mostly
because there was nothing left in it to break.
