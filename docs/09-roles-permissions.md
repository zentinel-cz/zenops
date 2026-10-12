# Roles and Permissions

Each account has exactly one role. Worker, Leader, Admin and Accountant are
mutually exclusive operating modes.

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

-   receives every registered application permission, including permissions
    added by later features
- cannot create, edit or submit a WorkDay
-   global operational administration
-   employee/user administration
-   close/reopen projects
-   close/reopen monthly periods
-   administrative corrections
-   global reporting and audit access

Admin's global permissions include employee profile and issued-item management.
Two domain rules remain role-bound: only a Worker creates their own WorkDay, and
only the current Project Leader approves or returns submitted work for that
Project. Admin can use the administrative correction workflows instead.

## Accountant

- view and edit profiles of Workers, including contact phone and workwear and
  shoe sizes
- manage the catalogue of company-issued workwear and equipment
- record issues and dated partial or complete returns for Workers
- correct an issue only with a reason; changes are audited
- view issue and return history
- cannot create or submit WorkDays, approve work, manage projects or manage
  employee accounts and role assignments

## Worker profile access

- view only their own profile and issued-item history
- cannot edit profile details, catalogue items, issue records or returns

Permissions must be backend-enforced and extensible rather than
hard-coded only in UI.
