# ADR-011: Business time and employee interval protection

Status: Accepted (user decision 2026-10-29)

Work and break intervals must not overlap for the same employee, including
intervals assigned to different WorkDays. Adjacent half-open intervals are
allowed. A shared PostgreSQL interval projection enforces this rule through
an employee-level exclusion constraint, including concurrent writes. Source
inserts, corrections and deletes maintain that projection transactionally.
Vehicle trips retain their separate vehicle occupancy rule; this decision
does not introduce a prohibition on overlapping travel and work.

The business timezone is Europe/Prague. All operational datetime forms and
clock displays use it regardless of the device timezone. Missing spring clock
times are rejected; repeated autumn clock times require an explicit first or
second occurrence. APIs continue to accept offset-qualified instants and the
database stores timestamptz values.

A WorkDay's date is the date on which the shift starts. Its work, breaks and
driver trips fit within that date and its following calendar day in Prague;
an interval may end at midnight immediately after the following day. This is
a calendar-date boundary, not a mandatory 12-hour shift or a 48-hour elapsed
limit. Drafts and returned days may be entered out of order. Before submission,
the earliest recorded work, break or driver trip must start on the WorkDay's
date. This invariant also applies to corrections of submitted/approved days.
The day and all its intervals remain in the starting month's operational
period, including a shift crossing a month or year boundary.

Migration 0019 adds the protection without rewriting source records. Existing
collisions and invalid business dates block the migration. Operators first
run ops/check-workday-times.sql and resolve findings through existing audited
corrections, preserving approved history. A missing rule for correcting an
historically incorrect WorkDay date must be resolved separately; the migration
does not invent a reassignment or silently move historical data.
