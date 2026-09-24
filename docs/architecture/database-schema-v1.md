# Proposed PostgreSQL Schema V1

This is the implementation blueprint for migrations. It does not create the
application schema yet.

## Identity and authorization

- `users`: authentication identity, status, password hash and employee link.
- `roles`, `permissions`, `role_permissions`, `user_roles`: extensible RBAC.
- `sessions`: hashed server-side sessions with expiry and revocation.
- `employees`: operational profile, active state and immutable identifier.

## Projects and calendar context

- `projects`: code, name, location, BESIP flag, dates, status and current
  leader.
- `project_leader_history`: effective-dated leader history.
- `project_days`: unique `(project_id, work_date)` weather, temperature and
  note record.
- `monthly_periods`: unique month with `OPEN` or `CLOSED` state and audited
  close/reopen metadata.

## Work records

- `work_days`: employee, business date, shift type and aggregate state.
- `work_entries`: project/project-day, interval, work type/activity,
  description and workflow state.
- `break_entries`: explicit interval belonging to a WorkDay.
- `approvals`: immutable approval/return events with approver identity,
  reason and timestamp.

Use PostgreSQL range/exclusion constraints where practical to prevent overlap
of one employee's work and breaks. Night shifts retain one WorkDay business
date while timestamps remain timezone-safe.

## Work classification

- `work_types`: seeded codes from the specification.
- `work_activities`: optional activities scoped to WorkType.
- Dynamic field requirements remain server-owned configuration, not arbitrary
  client JSON without validation.

## Machines and attachments

- `machine_types`, `machines`, `machine_usages`.
- `attachment_types`, `attachments`, `attachment_usages`.
- Usage stores suggested and entered start MTH, end MTH and fuel values.
- Exclusion constraints prevent overlapping use of a physical machine or
  uniquely tracked attachment.

## Vehicles and fuel

- `vehicles`, `vehicle_trips`, `vehicle_trip_participants`.
- One driver owns operational mileage/fuel; passengers reference the trip.
- `project_fuel_records`: unique active record per
  `(project_day_id, category)` with `recorded_by_employee_id`.

## Audit

- `audit_logs`: append-only actor, action, entity, before/after data, reason,
  request correlation ID and timestamp.
- Historical operational entities are deactivated or closed, never silently
  hard-deleted.

## Migration safeguards

- Migrations are forward-only, reviewed SQL committed to Git.
- Foreign keys, uniqueness and check constraints are mandatory where the
  business rule can be expressed in PostgreSQL.
- The legacy database is not attached to the new application. Any import must
  have an explicit mapping, rehearsal, reconciliation report and rollback.

