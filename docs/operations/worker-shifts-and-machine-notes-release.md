# Worker shifts, machine notes and exports — 2026-11-25

## Scope

- Worker-only machine entry places attachments beside the selected physical
  machine; mobile stacks the fields. Notes/faults belong to each MachineUsage,
  appear in its creation audit, scoped approval/history and daily/PDF reports.
- TREE_CUTTING adds Tyčová pila, renames the TRACTOR_DRIVER display to Strojník
  and retires HANDLING/OTHER without deleting history. Corrections can retain
  the original inactive activity. The independent OTHER work type remains.
- Automobil is a first-level own-shift choice, including an explanatory empty
  vehicle state. Existing driver/passenger ownership is unchanged.
- Own shift shows total/approved hours. Daily/PDF reports add per-employee
  totals, actual intervals and descriptions, preserving one-time counting of
  work, machines and shared vehicle fuel. Monthly reports retain existing
  shift-based hour totals; there is no monthly PDF/XLSX export.
- Admin configures optional time pairs for morning/afternoon/night with reason,
  transaction, version check and before/after audit. Worker reads these input
  suggestions and may change actual times. Initial pairs are empty; no company
  schedule is invented. AFTERNOON is additive and does not rewrite NIGHT.
- New-break entry is removed from Worker UI. Historical records and their
  correction/overlap protection are preserved. No automatic deduction added.

## Validation

- API and web TypeScript checks, API/contracts compilation and Vite production
  build passed. Shared business-time tests: 7 passed, including month/year
  rollover, selected date, Prague timezone and autumn DST ambiguity.
- Isolated PostgreSQL 16 Compose project zenops-worker-ui-check on the server:
  68 API tests passed (57 integration and 11 unit), none skipped. Includes
  machine note audit/HTML escaping, attachments, hours with multiple machines,
  historical activity correction, new afternoon shift, settings RBAC, bad
  pairs, trusted Origin and concurrent stale-version rejection.
- Runtime PDF check passed in a read-only API image with tmpfs and
  no-new-privileges: populated, empty and 10-page Czech PDFs, escaped text,
  HTTP headers, controlled Chromium failure and temporary-directory cleanup.
  Populated PDF and all ten stress pages rendered and visually reviewed.
- Browser UI against local built frontend/mock API: machine/attachments and
  fault note creation/display, new cutting options, vehicle role/selection,
  selected-date defaults, Admin preset save and Worker afternoon preset
  14:00–22:00 verified. These are test-only hours; production settings remain
  empty. Worker machine/report and settings layouts checked at 390px and
  desktop without page overflow. Actual backend behavior is covered by the
  isolated integration suite above.
- Windows embedded PostgreSQL could not load btree_gist (OS error 4551);
  integration verification therefore ran in the isolated Linux environment.
  Windows-to-Linux review transfer normalized the entrypoint's CRLF solely in
  the review copy; repository Git blob and production checkout use LF.

## Deployment

Requires forward migrations 0025_worker_machine_notes_and_activities.sql and
0026_admin_shift_presets.sql, then matching API/web images. Preserve previous
schema migration checksums. Preflight: production checkout 8488166, healthy
API/web/PostgreSQL and latest applied migration 0024. A verified pre-change
backup exists at /opt/zenops/backups/automatic/20261125T093047Z/database.dump.

Push the completed changes to main and let the existing two-minute server
automation process them. Verify migration rows, API/web artifact hashes,
readiness and public assets before reporting deployment. No Caddy changes.
