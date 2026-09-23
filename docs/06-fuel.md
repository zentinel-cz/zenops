# Fuel

## Machines

Tractors and slope mowers have fuel data per physical machine.

Record: - fuel consumed during the shift/use - amount refuelled

Consumption is a manually recorded operational value and is not assumed
to equal refuelling.

## Brushcutters

Brushcutter fuel is shared/global per ProjectDay rather than per
physical brushcutter.

One worker may claim responsibility for recording the group's fuel
consumption. Once claimed, other workers are informed who is recording
it.

Data ownership: - ProjectDay owns the fuel record. - Employee is only
`recorded_by`.

Leader/Admin may reassign the recorder.

Prevent duplicate active brushcutter fuel records for the same
project/day/category.
