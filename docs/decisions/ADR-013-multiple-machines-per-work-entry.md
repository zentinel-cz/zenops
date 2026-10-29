# ADR-013: Multiple machines on one WorkEntry

Status: Accepted (user decision 2026-10-29)

A WorkEntry is not limited to one machine. Each attached physical machine
has a separate MachineUsage containing its own MTH readings, fuel values
and attachments. The same physical machine cannot be attached twice to the
same entry. An entry can still contain no machine.

Existing time semantics remain: every attached machine and its attachments
occupy the WorkEntry's interval. Correcting that interval synchronizes all
attached usages transactionally. Different usage times require separate
WorkEntries; this decision does not introduce independent resource intervals.
Physical machine/attachment conflict protection remains in force.

Worker attaches additional machines to an own draft/returned entry through
the existing action. Approved/submitted entries and closed periods remain
locked. Admin corrects each individual MachineUsage through its existing ID;
Leader retains the existing approved-entry correction scope. No new removal
workflow or machine catalogue policy is introduced.

Worker history, administrative and scoped Leader corrections, daily report
and PDF return a machineUsages array. Attachments remain grouped by their
actual MachineUsage, not pooled across machines. Entries without a machine
return an empty array. Reporting counts one WorkEntry and one duration,
irrespective of the number of machines; each machine contributes its own
MTH/fuel to the monthly machine totals.

Migration 0021 replaces the single-entry uniqueness constraint with a unique
entry/machine pair and provides one shared machine-summary query. Existing
usage IDs, source rows, approvals and audit history are not rewritten.
