# Worker Work-Day Workflow

## Start

1.  Worker signs in.
2.  Home dashboard shows today's work record.
3.  Worker opens/creates WorkDay.
4.  Worker selects shift: `MORNING` or `NIGHT`.

The shift type does not force exact working times. Actual time comes
from WorkEntry intervals.

ADR-011 defines the business date as the shift's start date in Europe/Prague.
Work, breaks and driver trips can continue on the following calendar day.
Draft intervals may be entered out of order; submission requires the first
recorded interval to start on the selected date. Cross-month shifts belong
to the starting month's period. No fixed 12-hour duration is imposed.

## Add work

For every work interval: 1. Select an OPEN project. 2. Enter `from` and
`to`. 3. Select WorkType. 4. Select WorkActivity when required. 5.
Complete the dynamic fields relevant to the selected work. 6. Add
machine/attachment/vehicle data where applicable. 7. Save.

Worker can add multiple WorkEntries across multiple projects in one
shift.

## Breaks

Breaks are explicit intervals. WorkEntry and BreakEntry intervals for
the same employee must not overlap, even across different WorkDays. Adjacent
intervals are allowed. Database protection covers concurrent writes.

## Submission

Worker submits completed records. Server validates time overlap,
required fields, machine/attachment conflicts and meter rules.

Approval is project-based. If one WorkDay contains work on projects A
and B, their respective leaders approve their own project work.

A WorkDay is fully approved only when all relevant work has been
approved.

## Returned records

Leader may return an entry with mandatory reason. Worker corrects and
resubmits while the relevant month is open.

## Historical entry

Worker may create/fix a past WorkDay while its MonthlyPeriod remains
OPEN.

## Cancelling an accidentally created day

Under ADR-012, a Worker may cancel an own empty, never-submitted DRAFT in an
OPEN month with a reason. Admin may perform the same cancellation for an
employee. A day with work, breaks or driver-owned trips is not empty. Passenger
references to other drivers' shared trips are preserved and do not block this
action. Nothing is deleted or silently marked approved.

CANCELLED days remain visible in history and do not block monthly closure.
Only the owning Worker can explicitly restore the same day to DRAFT in an
OPEN month, with a reason and selected shift. Both actions are audited.
