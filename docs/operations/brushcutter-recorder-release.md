# Designated brushcutter fuel recorder

ADR-022 implements Admin selection of a single active Worker company-wide.
Migration 0027 adds a nullable Employee FK and independent assignment version
to the settings singleton. No recorder is selected automatically. Existing
fuel data, recorded_by attribution, reports and shift settings are preserved.

Admin uses Settings / Palivo křovinořezů, with required reason and audited
version checks. The designated Worker uses a separate mobile-first fuel-only
form with today's Prague date and project selection. Leader retains scoped
read access and metadata editing; both old and new fuel write routes reject
Leader. Admin retains correction access. Worker eligibility and delegation
are checked per request. Assignment is locked before project during writes.
No project weather, internal notes or other employees' work is exposed.

Validation:
- API/web TypeScript checks and Vite production build passed.
- Isolated PostgreSQL 16 Compose project `zenops-fuel-check`: 72 tests passed,
  none skipped. Includes assignment and stale-version rejection, role changes,
  inactive workers, immediate handover/removal, origin/schema checks, metadata
  isolation, Leader metadata-only editing, report attribution, non-destructive
  clearing/reactivation, project and month locks. Existing fuel transaction,
  audit rollback, report and other operational regressions remain covered.
- Browser preview: Worker reads/edits/saves existing fuel, Admin saves recorder
  assignment, desktop and 320/390px mobile controls and layout checked.
- Smallest viewport exposed a pre-existing body 320px minimum wider than the
  available width with a desktop scrollbar; cap the minimum at 100%.

Deployment: push completed changes to main, let the existing GitHub-polling
automation build matching API/web and apply migration 0027. Verify checkout,
runtime files, migration row, public assets and readiness before claiming live.
No Caddy or unrelated Compose changes. Do not assign a real employee as QA.
