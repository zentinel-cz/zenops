# ADR-012: Audited cancellation of empty WorkDays

Status: Accepted (user request to resolve empty-day closure blocking, 2026-10-29)

An accidentally created WorkDay can be resolved without inventing work or
deleting its history. Add a WorkDay-only CANCELLED state. A Worker cancels
their own empty draft; Admin can cancel an employee's empty draft as an
administrative correction, including for an inactive employee. Leader and
Accountant cannot cancel days. Cancellation requires an explicit reason.

An eligible day is DRAFT, has never been submitted (submitted_at is null),
and contains no WorkEntries, BreakEntries or driver-owned vehicle trips.
The month must be OPEN. A passenger reference belongs to the other driver's
trip, not to this WorkDay, and does not prevent cancellation or get deleted.
Submitted, returned, partially approved and approved records cannot be
cancelled by this workflow. Nothing is cancelled automatically.

Cancelled days retain their identity, employee, date and immutable audit
history. They do not count as active or unresolved days in monthly closure;
the period overview reports their count separately. All other unresolved
states continue to block closure (clarification of ADR-006 and BR-042).

Only the owning Worker may explicitly restore a cancelled day in an OPEN
month, with a reason and selected morning/night shift. Restoration reuses
the same WorkDay and returns it to DRAFT; it blocks closure until resolved.
Admin does not create or restore a shift on behalf of a Worker. Existing
cancellation events remain in the audit log after restoration. A duplicate
POST to create the same date does not restore it implicitly.

Cancellation, restoration and their before/after audits are transactional.
Database guards serialize child inserts with cancellation and reject new
work, breaks or driver trips on a cancelled day. Existing closed-period
guards cover both transitions. Cancelled empty days are exempt from the
shift-start check introduced in ADR-011, since they contain no shift.

Migration 0020 introduces the state and guards without modifying existing
days, operational records or historical decisions.
