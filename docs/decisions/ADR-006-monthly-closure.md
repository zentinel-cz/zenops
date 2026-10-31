# ADR-006: Monthly Closure

Status: Accepted

Operational months have OPEN/CLOSED state. Only Admin closes/reopens.
Unresolved records block closure. Reopening requires a reason and is
audited.

ADR-012 clarifies that explicitly cancelled empty WorkDays are resolved and
do not block closure. Ordinary empty drafts continue to block until cancelled.

The Admin closure overview explains the same existing unresolved-day
criterion with employee/date, pending entry/project states, current Leaders
and return reasons, plus direct navigation to the exact day. Counts and
blockers are read in one snapshot; closing still revalidates under the
existing period lock. Missing days are not inferred from a schedule, and
the overview performs no automatic approval or cancellation.
