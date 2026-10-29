# Multiple machines per WorkEntry — 2026-10-29

Prepared under accepted ADR-013. Not deployed from this workspace.

## Release contents

- Migration 0021 removes the single-machine-per-entry constraint and replaces
  it with uniqueness of the entry/machine pair. It does not rewrite existing
  usages, attachments, approvals or audit events.
- `work_entry_machine_usages` provides the same ordered JSON array for Worker
  history, administrative records, scoped Leader corrections and daily/PDF
  reports. Attachments are grouped by MachineUsage ID.
- Worker can repeatedly add distinct machines to an editable own entry.
  Already attached machines are omitted from that entry's selector. Each
  machine retains independent MTH/fuel/attachment fields and its existing
  full-entry occupancy interval.
- Admin corrections target a selected usage ID. Work-time corrections keep
  all machine and attachment intervals synchronized transactionally.
- Daily entry/time totals are computed without a one-to-many machine join.
  Monthly work totals remain once per WorkEntry; machine totals are per usage.

## Verification

- API suite: 47 passed, 0 skipped, including 36 PostgreSQL integration
  scenarios with the complete migration set through 0021.
- Shared time suite: 4 passed. Contracts/API/web TypeScript checks and
  production builds passed.
- New integration checks cover two machines on one entry, independent MTH
  and fuel, correct attachment grouping, duplicate/concurrent insertion,
  physical resource conflicts, ownership and role restrictions, single daily
  and monthly work totals, all-resource time synchronization, full rollback
  when one of several resources conflicts, per-machine Admin correction,
  retained approvals, closed months and draft-deletion cleanup.
- Real browser checks used built frontend, real Fastify API and disposable
  PostgreSQL 16.14. In headless Edge at 390px with a Los Angeles device
  timezone, Worker added both machines through the form and searched for
  the second one. Admin corrected only the second machine. The daily report
  retained one work row and 120 minutes. An actual PDF download contained
  both machine codes, both attachment codes and the corrected second MTH;
  PDF text was extracted and checked. Monthly machine totals were verified.
- Worker mobile and Admin mobile/desktop screenshots were inspected. The
  mobile pages had no horizontal overflow. Tests used synthetic identities;
  the disposable loopback database was stopped afterwards.

Docker/Compose execution and runtime migration-image inspection were not
available on this workstation. These remain deployment gates. Physical
phone/Safari testing was not performed.

## Deployment

Create and verify the normal database backup and source recovery artifact.
Use one checkout with `ops/deploy-production.sh` to build migrate, API and
web images and apply the complete ordered migrations including 0021.

Coordinate application replacement and refresh open browser sessions: entry
responses now contain machineUsages arrays instead of scalar/single-machine
fields. Do not keep serving the old API after multiple usages are recorded;
its scalar queries and joins are incompatible. Use forward-only repairs.

Verify the migration checksum, image versions, container health and one
authenticated two-machine scenario. Compare worked hours before and after
adding the second machine, inspect per-machine attachments and download PDF.
