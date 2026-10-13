# Domain Model

## Core entities

### User

Authentication identity.

### Employee

The required profile linked one-to-one with every User account. Profiles are
created with user accounts by Admin and deactivated rather than hard-deleted.
Contact phone and workwear sizes are stored on the profile; Workers may read
their own profile and issued-item history. Accountant can browse every user
and manage issued-item records for all roles.

### Role / Permission

Initial roles: `ADMIN`, `LEADER`, `WORKER`, `ACCOUNTANT`. Each account has
exactly one role. Permissions should be extensible.

### IssuedItemType / EmployeeItemIssue / EmployeeItemReturn

The item catalogue describes types of company-provided workwear and equipment.
An issue records the item, user, quantity, optional size, issue date, place
of issue and optional note. Returns are dated quantity events, allowing partial returns
and a history of what remains with each user. Accountant can correct issue and
return dates through audited workflows. Catalogue items are
deactivated rather than deleted. Costs and warehouse stock are outside scope.

### Project

An operational project/job. Created by Admin or Leader. Exactly one
current Leader. Visible to all workers while open.

### ProjectDay

Calendar-day record belonging to a Project. Contains date-specific
project information such as weather, temperature and note.

### WorkDay

One employee shift/work-day container. Employee chooses morning or night
shift. A night shift may cross midnight.

### WorkEntry

A time interval of actual work. Belongs to Employee/WorkDay and
Project/ProjectDay. Contains work type/activity and optional resource
usage.

### BreakEntry

Explicit break interval within WorkDay.

### WorkType

Initial values: - MACHINE_MOWING - BRUSHCUTTER - TREE_CUTTING -
REPROFILING - OTHER

### WorkActivity

Optional finer activity under a WorkType. Tree cutting initially
supports: - SAWYER - TRACTOR_DRIVER - HANDLING - CLEANUP - OTHER

### Machine / MachineType

Physical work machine and its classification.

### MachineUsage

Use of a machine by a WorkEntry, including start/end meter readings and
shift fuel consumption/refuelling where applicable.

### Attachment / AttachmentType / AttachmentUsage

Physical attachments that can move between machines and whose usage
history must be retained.

### Vehicle / VehicleUsage

Vehicles are separate from machines. Vehicle usage belongs to a
WorkDay/trip context. One participant is driver; others may be
passengers.

### ProjectFuelRecord

Shared project-day fuel record, initially used for global brushcutter
fuel consumption. The employee is `recorded_by`, not the owner.

### Approval

Approval state for a WorkEntry or project-specific group of entries.
Approval authority derives from Project Leader.

### AuditLog

Immutable record of sensitive changes.

### MonthlyPeriod

Represents monthly operational closure: `OPEN` or `CLOSED`.

## Key relationships

See `architecture/er-diagram.md`.
