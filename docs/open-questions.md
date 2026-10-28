# Open Questions / Deferred Scope

These items are intentionally not to be invented during V1
implementation.

## Payroll rules

Future design: - exact overtime rules - night-work premium calculation -
Saturdays/Sundays - Czech public holidays - wage supplements - actual
payroll calculation/export

The V1 data model must not block these features.

## Absence / HR

Future modules: - vacation requests - sickness/absence handling -
employee requests - announcements

Missing WorkDay in V1 does not automatically mean absence.

## Maintenance

Machine/vehicle breakdown, service and maintenance workflows are
deferred.

## Reporting

XLSX export is optional after PDF daily report and core monthly
reporting.

## Notifications

Notification channels and escalation rules are deferred.

## Project leader reassignment — resolved by ADR-010

Only Admin can replace the current Leader with a reason and assignment history.

## Deleting deactivated users — decision required

The requested workflow would allow an Admin to permanently delete a
deactivated user's account, profile and all related records. This conflicts
with BR-038 and the domain model, which require employees with historical
data to be deactivated rather than hard-deleted. It also conflicts with the
requirement to keep approved and historical operational data auditable.

Choose the retention policy before implementation:

- Keep the current rule: deactivated users and their history remain stored.
- Permit hard deletion only when the employee has no operational or audit
  history; define which related records count as history.
- Remove or anonymize personal/account data while retaining operational and
  audit records; define which identity fields and audit references remain.
- Revise the retention rules to allow deleting historical records too, and
  specify how shared, approved and audit-linked records should be handled.

Until this decision is made, user deletion is deferred. No deletion behavior
may cascade through historical or shared operational records by assumption.

## Leader handover and ProjectDay read scope — resolved

User approved ADR-010: Admin-only handover, current-Leader scoped history and
approved-work corrections, and restricted shared project-day/fuel reads.
An inactive or demoted Leader does not retain operational access. Admin can
assign another active Leader; no Admin approval fallback is introduced.
