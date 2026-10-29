# Business time and cross-day overlap protection — 2026-10-29

Implements accepted ADR-011. Prepared in the repository; this document does
not confirm deployment to the running ZenOps installation.

## Release contents

- Migration 0019 projects employee work and breaks into a common interval
  table with an employee-level exclusion constraint. Inserts, corrections
  and source deletions synchronize the projection in the same transaction.
- Prague business-date bounds protect work, breaks and driver trips. Deferred
  validation checks the shift's starting date at submission and after changes
  to submitted/approved records, while allowing out-of-order draft entry.
- Shared browser time conversion, explicit repeated-hour selection and
  missing-hour rejection replace device-local conversions. Operational date
  defaults also use Prague. Admin break corrections use a datetime form.
- RBAC, approval authors and the starting-month ownership of a cross-month
  WorkDay remain unchanged. No mandatory twelve-hour duration is introduced.

## Before deployment

1. Create and verify the database backup and source recovery artifact using
   the existing release procedure.
2. Run `ops/check-workday-times.sql` read-only against the intended database.
   All three result sets must be empty. They identify overlapping employee
   intervals, intervals outside the two business dates, and submitted shifts
   whose first interval does not start on the selected date.
3. Resolve findings through audited corrections. Do not rewrite or delete
   historical records to make migration pass. If the WorkDay date itself is
   wrong, stop and obtain a decision on its correction workflow.
4. Deploy one checkout through `ops/deploy-production.sh`, rebuilding migrate,
   API and web images together. Migration 0019 takes source-table write locks,
   checks historical data again and backfills only the derived interval table.
   Any conflicting source data aborts the migration before the app is replaced.

## Verification

Local checks use pnpm 10.33.0 dependencies, TypeScript checks and production
builds for contracts, API and web. Shared time tests exercise winter/summer
offsets, spring gaps, both autumn occurrences and devices in UTC, Tokyo and
Los Angeles. API integration runs use disposable PostgreSQL 16.14 bound only
to loopback, with the full ordered migration set and an Asia/Tokyo process
timezone. The temporary database is stopped afterwards.

Final API suite: 40 passed, 0 skipped (including 29 database integration
scenarios). Shared time suite: 4 passed. TypeScript checks and production
builds passed. Browser checks passed for both device timezones below.

Integration scenarios cover cross-day work/work, work/break and break/break
conflicts; adjacent intervals and different employees; correction rollback,
successful projection updates and deletion cleanup; concurrent API writes and
direct SQL protection; cross-year month ownership; business-date enforcement
for work, breaks and trips; and the elapsed duration of DST transitions.
Migration checks reconstruct the prior schema in a rolled-back transaction:
overlaps, invalid dates and invalid shift starts are rejected, while valid
source rows survive backfill unchanged.

Browser checks use the built web application in headless Edge at 390px with
mocked API responses, in Tokyo and Los Angeles timezones. They verify Prague's
current date, mandatory repeated-hour choices, exact submitted UTC instants,
spring-gap rejection before any write and absence of horizontal overflow.
This is not a browser check against the deployed server or a physical phone.

Docker/Compose execution and migration-image inspection were not available on
this workstation. Complete those release gates before deployment, verify the
0019 checksum and container health, then test a real authenticated night shift
and an audited correction in the intended environment.
