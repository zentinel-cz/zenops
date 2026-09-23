# Machines and Attachments

## Management

Admin and Leader manage machine/attachment catalogues. Workers record
usage.

## Machines

Machines use `Machine` + `MachineType`, not separate database tables for
every machine category.

Machines may track operating hours.

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
