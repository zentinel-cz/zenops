# Reporting

## Live daily report

The daily report is live, not a manually generated duplicate.

It aggregates current operational data and clearly distinguishes: -
in-progress/unapproved data - approved data

Leader/Admin can drill down:
`day -> project -> employee -> work entry -> resource usage`.

## Daily report content

At minimum: - workers - worked hours - projects - work
types/activities - breaks - machines - operating hours - attachments -
machine fuel consumption/refuelling - vehicles and mileage - shared
brushcutter fuel - approval status

## Download

Under ADR-013, every WorkEntry appears once with its machineUsages list.
Each machine retains its own readings, fuel and attachment grouping in the
live report and PDF. Additional machines do not multiply employee hours or
entry/worker counts. Monthly machine totals include each physical usage once.

Leader/Admin can download a professional PDF daily report. XLSX may be
added later.

## Monthly reports

At minimum: - hours per employee - shift/time breakdown where
supported - hours per project - machine MTH - machine fuel - shared
fuel - vehicle operational totals - general overview suitable as input
for payroll/reward allocation

ZenOps V1 provides inputs for wages/rewards; it does not calculate
payroll.

## Closed project overview

Closed projects retain historical totals and remain available for
reporting.
