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
-   **BR-034** Leader cannot approve their own work; Admin approves it.
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
    work remains.
-   **BR-043** Closed month prevents ordinary operational edits.
-   **BR-044** Admin may reopen a month only with a recorded reason.
-   **BR-045** Month close/reopen is audited.
-   **BR-046** V1 does not infer illness/vacation from missing WorkDay.
-   **BR-047** Existing draft work for a newly closed project may be
    completed/submitted, but no new entry may be created.
-   **BR-048** All authorization and critical validation must be
    enforced server-side.
