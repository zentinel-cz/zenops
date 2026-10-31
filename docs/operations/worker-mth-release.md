# Worker MTH correction release

Deploy API, shared contracts and web from the same revision using the
standard ZenOps deployment process and current migrations. No additional
schema migration is required. This change has not been deployed from this
workspace.

ADR-017 authorizes Workers to correct only start/end MTH on their own
draft/returned WorkEntries in an editable day and open month. The request
requires two non-negative readings (end >= start) and a trimmed reason of
3–1000 characters. Extra identity, fuel and attachment fields are rejected.
Submitted/approved work and other users' entries remain inaccessible.

The endpoint locks WorkDay, WorkEntry and MachineUsage in order and writes
both the correction and MACHINE_MTH_WORKER_CORRECTED audit in one transaction.
Suggested readings, fuel, attachments, intervals, other machine usages and
prior approval decisions are preserved. Readings on a since-deactivated
machine remain correctable. Returning-state corrections require explicit
resubmission through the existing workflow.

## Local verification

- 63 API tests, including 52 PostgreSQL integration tests, and 4 shared tests.
- API/web type checks and production builds.
- Draft and returned MTH corrections, decimals, multiple machines,
  deactivated machine, exact preservation of all other usage fields,
  attachment rows and prior approvals; before/after actor/reason audit.
- Owner, role, Origin, day/entry/usage relationship and state checks,
  approved sibling protection, submitted and closed-period rejection,
  invalid/extra field rejection and unchanged database values on audit failure.
- Concurrent correction/submission yields either the audited correction
  before submission or a rejected correction after it.
- Real Edge at 320/390/768/1440 pixels: per-machine controls and prefilled
  form, reason/end validation, failed-save input retention, Escape cancel,
  returned-work repair and resubmission with corrected values in the Leader
  queue; no horizontal page/dialog overflow. Fuel and approvals are retained.
