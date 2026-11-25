# Project activity and daily machine roster — 2026-11-25

## Changes

- New-project start date defaults to today's Europe/Prague business date.
  Existing date/period/issued-item controls already default to today/current
  month. Corrections preserve saved dates, selected WorkDay dates and configured
  shift times; optional project end date remains optional (ADR-021).
- Morning/night cards restore their icon column and explicitly place the title
  and time in the second column. Mobile stacks the cards. Submission block uses
  a centered grid, with no float, bounded button width and wrapping text.
- Project directory uses distinct bordered cards with code, name, location,
  status and an Open action. Current Leader/Admin can open a selected date's
  participants, draft/submitted/returned/approved work, machine usages and
  attachments/fault notes. Refresh/retry and empty-day states are explicit.
- Project activity uses one authorized SQL statement and includes only the
  selected project's work, never whole-WorkDay state or unrelated work/trips.
  Project handover revokes the former Leader's access on subsequent requests.
- Daily UI/PDF and project activity share a physical-machine aggregation:
  unique usage IDs, sum of per-usage MTH differences, separate consumption and
  refuelling totals, measured usage count, chronologically sorted operator/
  project/interval/state/attachment/note details. Missing values stay unknown.
  Employee work is still counted once; all provisional data is labelled.

## Verification

- API/web TypeScript and production compilation passed.
- Isolated PostgreSQL 16 project zenops-worker-ui-check: 71 tests passed,
  none skipped (58 integration, 13 unit). Coverage includes multiple operators,
  meter precision/null/zero/deduplication, draft participants and attachments,
  own-project scope, unauthorized roles, invalid/empty dates, closed projects
  and immediate access changes after Leader handover.
- Read-only runtime PDF checks passed: populated and empty exports, handled
  renderer failure, download headers, escaped text and temporary cleanup.
  Populated 2-page and long 11-page PDFs were rendered and visually reviewed.
- Browser on built local frontend/mock API: mobile/desktop shift cards,
  centered submission button inside its panel, distinct project cards,
  project participants, attached equipment and expandable machine summary,
  today's new-project start default. Layouts inspected at desktop and 390px,
  with additional width/centering checks at narrow and tablet sizes.
- No production operational records were created for these checks.

## Rollout

No migration or Caddy change. Deploy matching API/web from the same commit
through existing GitHub automation, verify source and API/web hashes plus
container readiness. Unrelated containers remain untouched.
