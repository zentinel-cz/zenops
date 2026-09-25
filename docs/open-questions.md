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

## Project leader reassignment

V1 requires exactly one current Project Leader and effective-dated history,
but the accepted rules do not state who may reassign an existing project's
Leader. The database retains the required history structure; the reassignment
endpoint remains intentionally unimplemented until the authority and any
required reason/approval are decided.
