# Business Rules

-   **BR-001** Every employee maintains their own WorkDay.
-   **BR-002** Employee chooses `MORNING` or `NIGHT` shift.
-   **BR-003** Shift type does not force exact working hours.
-   **BR-004** Night shift may cross midnight and remains one WorkDay.
-   **BR-005** WorkDay may contain multiple WorkEntries.
-   **BR-006** WorkDay may contain work on multiple projects.
-   **BR-007** Breaks are explicit time intervals.
-   **BR-008** Employee work/break intervals must not overlap.
-   **BR-009** All workers may select all OPEN projects.
-   **BR-010** CLOSED projects reject new WorkEntries.
-   **BR-011** Admin closes/reopens projects.
-   **BR-012** Project has exactly one current Leader.
-   **BR-013** Admin or Leader may create a Project.
-   **BR-014** Project weather/temperature belongs to ProjectDay, not
    each employee record.
-   **BR-015** Work form is dynamic according to WorkType/WorkActivity.
-   **BR-016** Tree cutting does not require a tractor; worker may be
    sawyer or another activity.
-   **BR-017** `OTHER` work supports manual description.
-   **BR-018** Machine start MTH is suggested from the latest valid end
    MTH.
-   **BR-019** Worker may correct suggested start MTH.
-   **BR-020** Corrected suggested MTH is auditable.
-   **BR-021** Machine end MTH must be \>= start MTH.
-   **BR-022** A physical machine cannot have overlapping usage by
    multiple workers.
-   **BR-023** A uniquely tracked attachment cannot have overlapping
    usage.
-   **BR-024** Machine consumption is recorded per physical machine.
-   **BR-025** Consumption and refuelling are distinct values.
-   **BR-026** Brushcutter fuel is shared per ProjectDay/category.
-   **BR-027** Brushcutter fuel is owned by ProjectDay; employee is only
    recorder.
-   **BR-028** Prevent duplicate brushcutter fuel records for the same
    project/day/category.
-   **BR-029** Shared vehicle operational data is recorded by the
    driver.
-   **BR-030** Passengers do not duplicate vehicle operational values.
-   **BR-031** Approval is determined by Project Leader.
-   **BR-032** Different project entries in one WorkDay may require
    different approvers.
-   **BR-033** WorkDay is fully approved only when all relevant work is
    approved.
-   **BR-034** Only the current Project Leader may approve or return submitted
    WorkEntries for that Project; Admin does not perform operational approval.
-   **BR-035** Returned work requires a reason.
-   **BR-036** Worker cannot freely modify approved records.
-   **BR-037** Sensitive corrections must be audited.
-   **BR-038** Employees/assets/projects with historical data are
    deactivated/closed, not hard-deleted.
-   **BR-039** Daily report is live and distinguishes provisional from
    approved data.
-   **BR-040** Worker may add past records while the month is OPEN.
-   **BR-041** Monthly period has `OPEN`/`CLOSED` state.
-   **BR-042** Month cannot close while submitted/returned/unresolved
    work remains. Explicitly cancelled empty WorkDays are resolved (ADR-012).
-   **BR-043** Closed month prevents ordinary operational edits.
-   **BR-044** Admin may reopen a month only with a recorded reason.
-   **BR-045** Month close/reopen is audited.
-   **BR-046** V1 does not infer illness/vacation from missing WorkDay.
-   **BR-047** Existing draft work for a newly closed project may be
    completed/submitted, but no new entry may be created.
-   **BR-048** All authorization and critical validation must be
    enforced server-side.
-   **BR-049** Each user has exactly one role. `ACCOUNTANT` is a separate
    role and does not inherit Worker, Leader or Admin permissions.
-   **BR-050** A Worker can read only their own profile and issued-item
    history. Admin creates user accounts and profiles. Accountant can browse
    all users and manage issued-item records across all roles.
-   **BR-051** A Worker profile stores contact phone, upper-body and lower-body
    workwear sizes, and shoe size. Changes are audited.
-   **BR-052** An issue records a user, catalogue item, positive quantity,
    optional size and note, issue date and issue location. Returns are separate dated
    quantity events and may be partial. Returned quantity cannot exceed the
    issued quantity.
-   **BR-053** Issued-item and return history is retained. Issue corrections
    require a reason and an audit record. Catalogue types are deactivated,
    not deleted. The feature does not track purchase cost or warehouse stock.
-   **BR-054** Every user account has exactly one Employee profile. Only Admin
    may create user accounts and their profiles. Accountant can view the
    directory of all users and manage issued-item records for any user.
-   **BR-055** Accountant may correct the issue date through the audited issue
    correction workflow and may correct a return date only with a reason and
    an audit record. Return quantity and ownership remain unchanged by a date
    correction; return records cannot be deleted.

See accepted ADR-009 for the expanded all-user equipment scope; ADR-007 remains
the source for the original worker profile fields and role separation.

- **BR-056** Only Admin replaces the current Project Leader with a reason and assignment history. Access follows current assignment and current role; historical approvals retain their authors (ADR-010).
- **BR-057** Current Leader may correct approved work entries on own projects in open months with a reason and audit. Project transfer, breaks and trips remain Admin-only. Machine-meter corrections are Admin-only except for Worker corrections of own draft/returned entries in editable days and open months under ADR-017.
- **BR-058** Shared ProjectDay notes and fuel are visible only to Admin and the current Leader, including historical dates and closed projects.

- **BR-059** Employee work and break intervals cannot overlap across WorkDays,
  including concurrent writes. Adjacent intervals are allowed (ADR-011).
- **BR-060** Operational times use Europe/Prague for input and display. Missing
  DST times are rejected and repeated times require an explicit occurrence.
- **BR-061** WorkDay date identifies the shift's starting business date. Work,
  breaks and driver trips fit within that date and the following calendar day;
  submission and subsequent corrections preserve the starting-date invariant.
  The starting month owns the whole WorkDay (ADR-011).

- **BR-062** A Worker may cancel an own empty, never-submitted DRAFT in an
  OPEN month with a reason; Admin may cancel such a day for an employee.
  Work, breaks and driver-owned trips prevent cancellation. Passenger links
  to another driver's trip are retained and do not prevent it (ADR-012).
- **BR-063** CANCELLED WorkDays retain their identity and audited history,
  contain no own operational records and do not block monthly closure.
  They are counted separately from active and unresolved days.
- **BR-064** Only the owning Worker may explicitly restore a cancelled day
  to DRAFT in an OPEN month, with a reason and chosen shift. Restoration
  reuses the same day, preserves cancellation history and blocks closure
  until the day is resolved again. Neither transition deletes history.

- **BR-065** One WorkEntry may use multiple distinct physical machines.
  Each MachineUsage stores its own MTH, fuel and attachments; one machine
  cannot be attached twice to the same entry (ADR-013).
- **BR-066** All attached machines inherit the WorkEntry interval and remain
  subject to physical-resource conflict checks. Reporting counts the entry
  and employee time once; machine MTH/fuel totals include each usage once.
