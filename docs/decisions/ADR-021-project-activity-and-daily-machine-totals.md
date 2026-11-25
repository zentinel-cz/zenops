# ADR-021: Project activity and daily physical-machine totals

Status: Accepted — explicit user request 2026-11-25

Admin and the current project Leader may open a project's operational day.
The default is today's business date in Europe/Prague. A participant is an
employee with at least one WorkEntry on that project on the selected WorkDay
business date, including DRAFT, SUBMITTED, RETURNED and APPROVED entries.
This is an overview of entered work, not a plan, live location or inferred
attendance. An empty WorkDay has no project association and is not assigned
to a project by assumption.

Project metadata, scoped entries, employee identities, work/shift details and
machine usages are authorized in one SQL statement. Other projects' entries,
whole-WorkDay state, breaks and trips are not returned. Access follows current
assignment including closed projects and changes immediately after handover,
as in ADR-010. Workers and Accountant do not receive project-activity access.

Daily machine summaries group unique MachineUsage identities by physical
machine. MTH totals sum individual end-start differences, never absolute
readings or employee work durations. Fuel consumption and refuelling sum
separately. Unknown readings/fuel remain null rather than becoming zero; the
number of usages with an MTH pair is shown. Each usage retains its operator,
project, interval, approval state, attachment codes and fault note. Usages are
ordered chronologically. The same summary logic is used by the project view
and the existing authorized daily report/PDF. Aggregates include provisional
and approved work, explicitly labelled, without widening report scopes.

The project directory uses distinct cards with a named open action. Existing
create/edit/close permissions and operational state transitions are unchanged.
New required date input defaults to today's Prague date; selected work dates,
configured shift times and original correction values remain authoritative.
Optional project end date is not invented for an ongoing project.

This change is read/UI-only and needs no database migration.
