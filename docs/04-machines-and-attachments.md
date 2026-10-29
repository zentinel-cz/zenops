# Machines and Attachments

## Management

Admin and Leader manage machine/attachment catalogues. Workers record
usage.

## Machines

Machines use `Machine` + `MachineType`, not separate database tables for
every machine category.

Machines may track operating hours.

ADR-015 makes tracking independent for each catalogue item. Types are
immutable name/setting variants; editing one item assigns it to the requested
variant rather than redefining a shared row. The same displayed type name may
therefore be used by machines with different MTH settings and attachments
with different tracking markers. Creation and changes audit the actual setting.

Under ADR-013, a WorkEntry can have multiple MachineUsages, one per selected
physical machine. Each usage retains separate MTH, fuel and attachments. A
machine can appear only once per entry. All attached usages use the entry's
interval; correcting it updates every attached machine and attachment in the
same transaction. WorkEntry counts and worked hours are not multiplied by
the number of machines.

## Meter readings

For tracked machines: - start MTH - end MTH - calculated difference

Start MTH is prefilled from the latest known valid end reading. Worker
may correct it.

If worker changes the suggested start reading, preserve both suggested
and entered values and audit the change.

Hard validation: - end MTH cannot be lower than start MTH.

## Concurrent usage

A physical machine cannot be used by two workers during overlapping
intervals. Worker must not be able to save a conflicting usage.

The same principle applies to uniquely tracked physical attachments.

## Attachments

Attachments are independent assets. They are not permanently owned by
one tractor/machine. Keep usage history so the system can answer who
used which attachment with which machine and when.

Future note: breakdown/service/maintenance workflow is intentionally
deferred.

The non-unique attachment occupancy question remains deferred. Current
physical-resource conflict protection is retained under ADR-013 and ADR-015.
