# Empty WorkDay cancellation — 2026-10-29

Prepared under ADR-012. Not deployed to the running ZenOps installation from
this workspace.

## Release contents

- Migration 0020 adds CANCELLED state and cancellation metadata without
  rewriting any existing day or operational record.
- Worker can cancel an own empty, never-submitted draft; Admin can perform
  the same audited correction for any employee, including an inactive one.
- Only the owning Worker restores the same cancelled day in an open month,
  with a reason and chosen shift. Duplicate creation does not restore it.
- Database guards retain before/after audits, serialize new child records
  against cancellation and preserve cancellation history after restoration.
- Period totals exclude cancelled days from active/unresolved counts and
  expose a separate cancelled count. Ordinary empty drafts still block closure.
- Passenger references remain with the driver's shared trip and are retained.

## Local verification

- Full API suite: 44 passed, 0 skipped, including 33 PostgreSQL integration
  scenarios using the complete migration set through 0020.
- Shared contracts time suite: 4 passed.
- Contracts/API/web TypeScript checks and production builds passed.
- Integration checks cover reasons, ownership, all four roles, cancellation
  eligibility, inactive employees, retained approvals and passenger trips,
  duplicate actions, direct SQL rejection, deletion protection, same-ID
  restoration, closed months, monthly counts and concurrent writes/closure.
- Headless Edge at 390px with device timezone America/Los_Angeles used the
  built frontend, real Fastify API and disposable PostgreSQL 16.14. Verified
  Worker create/cancel/restore/cancel, mandatory reasons, unchanged identity,
  persisted audit events, Admin cancellation, separate monthly counts,
  successful closure and hidden restoration in the closed month. Both Worker
  and Admin pages had no horizontal overflow. Screenshots were inspected.
- All checks used synthetic identities and an isolated loopback-only database,
  which was stopped afterwards. The existing ZenOps database was not used.

Docker/Compose execution and migration-image inspection remain unverified on
this workstation because Docker is unavailable. A physical phone was not used.

## Deployment

1. Preserve the normal database backup and source recovery artifact, and verify
   them before changing the target environment.
2. Build migrate, API and web from the same checkout using
   `ops/deploy-production.sh`; apply the full ordered migrations including
   0020 before starting the new application images.
3. Verify the 0020 checksum, container health and authenticated role-specific
   scenarios. Check one empty Worker day, one Admin cancellation and the
   period counts before attempting a real closure.
4. Do not silently cancel existing drafts in bulk. Each cancellation requires
   a deliberate action and a reason. Do not downgrade to an API that does not
   understand CANCELLED after this state is used; use forward-only repairs.
