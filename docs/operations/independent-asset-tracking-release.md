# Independent asset tracking release

Apply migration 0023 and deploy API/web from the same revision using the
standard ZenOps release procedure, with a verified database backup and source
bundle. This feature has not been deployed from this workspace.

## Migration and compatibility

Migration 0023 replaces type-name uniqueness with name/setting uniqueness for
machine_types and attachment_types, and prevents in-place changes to their
rows. No type IDs, asset assignments, readings, usage records, approvals or
audit records are rewritten. Existing values are the baseline; the migration
does not guess settings that may have been unintentionally changed earlier.

The new API upserts the exact name/setting variant and updates only the
selected asset's foreign key. Reverting a choice reuses the original variant.
Creates and updates audit type identity/name and tracking value alongside the
item's attributes. Worker MTH validation continues to follow the selected
machine's actual setting. Previous readings remain visible in reports.

Do not run an old API against the new schema: its ON CONFLICT(name) statements
are incompatible and would reject catalogue writes. Coordinate the switch
with the migration; if schema migration fails, do not start the new API.
Use forward repair/recovery rather than collapsing type variants or deleting
historical data. Physical-resource occupancy rules are unchanged; non-unique
attachment occupancy is a separate deferred question.

## Verification completed locally

- 57 API tests, including 46 PostgreSQL integration tests, and 4 shared tests.
- Type checks and API/web production builds.
- Both asset kinds: same type name with opposing flags; identical variant
  reuse; single-item editing/reversion; simultaneous creates; transactional
  rollback on duplicate code; role/origin/reason checks; complete audit;
  database rejection of type redefinition and duplicate variants.
- Migration applied to an isolated pre-0023 schema with populated catalogue:
  complete before/after rows match, including IDs, flags and assignments.
- Approved work, readings, attachments and approvals remain unchanged after
  tracking edits. New usage without MTH succeeds for the untracked machine
  and is rejected for its tracked peer; historical readings stay in reports.
- Real Edge: create/edit/reload machines and attachments with independent
  flags, search tracking status, audit verification, and actual Worker form
  requiring MTH only for the selected tracked machine. Layout checked at
  320, 390, 768 and 1440 pixels without horizontal overflow.
