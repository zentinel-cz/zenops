# Roles and Permissions

Each account has exactly one role. Worker, Leader and Admin are mutually
exclusive operating modes.

## Worker

-   manage own draft/returned WorkDays and WorkEntries
-   select any OPEN project
-   record own work, breaks, machine use and allowed operational data
-   choose morning/night shift
-   submit records
-   view own history

## Leader

Leader is an operational-management role and does not inherit Worker WorkDay
capabilities. A user with the Leader role cannot create, edit or submit a
WorkDay.

- create projects
- manage machine/attachment/vehicle catalogues
- manage operational fuel records
- manage ProjectDay data
- approve/return work for projects where they are the current Leader
- view/download reports relevant to their operational scope
- correct approved records for own projects while allowed

Leader is the only role that approves or returns submitted WorkEntries for the
Projects assigned to that Leader.

## Admin

- cannot create, edit or submit a WorkDay
-   global operational administration
-   employee/user administration
-   close/reopen projects
-   close/reopen monthly periods
-   administrative corrections
-   global reporting and audit access

Permissions must be backend-enforced and extensible rather than
hard-coded only in UI.
