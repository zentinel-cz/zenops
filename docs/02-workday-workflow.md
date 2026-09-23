# Worker Work-Day Workflow

## Start

1.  Worker signs in.
2.  Home dashboard shows today's work record.
3.  Worker opens/creates WorkDay.
4.  Worker selects shift: `MORNING` or `NIGHT`.

The shift type does not force exact working times. Actual time comes
from WorkEntry intervals.

## Add work

For every work interval: 1. Select an OPEN project. 2. Enter `from` and
`to`. 3. Select WorkType. 4. Select WorkActivity when required. 5.
Complete the dynamic fields relevant to the selected work. 6. Add
machine/attachment/vehicle data where applicable. 7. Save.

Worker can add multiple WorkEntries across multiple projects in one
shift.

## Breaks

Breaks are explicit intervals. WorkEntry and BreakEntry intervals for
the same employee must not overlap.

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
