# Product readiness review — 2026-10-13

## Implemented corrections

- Shared Czech labels in UI, search and PDF; localized framework errors.
- Rate-limit plugin registration now precedes real route registration. A test
  hits the actual login endpoint and proves the sixth request receives 429.
- Daily report now includes vehicle trips and shared fuel; worker totals use employee IDs so identical names do not merge.
- Full-width project list without silently hiding all but five records.
- Responsive daily-report cards, wrapping navigation labels and form controls,
  bounded account panel, and corrected monthly search layout.
- Reload races are suppressed in daily/monthly reports, project-day data,
  worker-day records and administrative date selection.
- Mutations recover from network errors and duplicate submissions are guarded.
- Worker can select a past date, see a returned reason and correct an editable
  entry without deleting approval history. Approved entries remain locked.
- Approval decisions lock their parent WorkDay before calculating its state.
- Administrative work corrections retain the complete original entry in audit.
- Migration 0017 protects closed periods and synchronizes resource occupancy
  after a work interval changes. Existing stored intervals are not rewritten.

## Database and release

Apply `0017_operational_period_guards.sql` before starting the new API. Use the
existing `ops/deploy-production.sh` release procedure, including backup and
migration-image build; do not deploy the API alone. This change has not been
applied to production from this workspace.

Before release, inspect pre-existing inconsistent resource intervals:

```sql
select mu.id, mu.work_entry_id from machine_usages mu
join work_entries we on we.id=mu.work_entry_id
where mu.start_at<>we.start_at or mu.end_at<>we.end_at;
select au.id, au.work_entry_id from attachment_usages au
join work_entries we on we.id=au.work_entry_id
where au.start_at<>we.start_at or au.end_at<>we.end_at;
```

Resolve any findings with audited administrative correction after backup.
Do not silently rewrite historic records. The new trigger keeps future edits
consistent and rolls back collisions.

## Disposable integration checks

Requires Docker with Compose. The separate project has no production volumes,
no published database port, and discards its database when stopped. Trust
authentication is limited to this isolated ephemeral test network.

```sh
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
docker compose -f compose.test.yaml down --volumes
```

The existing integration suite applies the complete ordered migration set.
Additional coverage checks returned-work correction with retained approvals,
rejection of approved-entry correction, database rejection of closed-period
writes, and propagation of corrected intervals to machines and attachments.

## Release gates still to execute

This workstation has no Docker/PostgreSQL executable. Database integration and
Compose runtime checks are therefore not locally verified. Browser automation
could not connect in this session, so responsive CSS changes are not visually
certified. Do not describe this revision as fully production verified.

Before release, run the disposable database suite and check all four roles in
a dedicated preview at widths 320, 390, 430, 768, 1024 and 1440 pixels:

1. Admin: create/edit/deactivate users, long names, all projects, administrative
   correction, reports, month closure/reopening and equipment records.
2. Leader: project creation, own approval queue, return with reason, two
   concurrent approvals in one day, daily data and fuel, reports and assets.
3. Worker: morning/night shift, midnight crossing, past day, machine and
   attachments, passenger trip, submission, returned correction and resubmission.
4. Accountant: directory search, user detail, issue, partial return, correction
   dates and return to the retained directory filter.
5. Slow/failed requests, rapid date/project switches, repeated submit, keyboard
   navigation, long translated labels and mobile keyboard with open forms.

Known follow-up verification areas: atomic saving of project weather and fuel
still uses two API requests (partial success is explicitly reported); complete
report detail including vehicles and shared fuel needs authenticated visual
review; business timezone behavior must be checked on a device set to a
foreign timezone. Native browser form-validation text follows browser language.

## Local check results

TypeScript checks passed for contracts, API and web. The web production build passed. API tests: 11 passed, 20 database integration tests skipped because TEST_DATABASE_URL is not configured. No production database or deployment was changed.
