# Fuel

## Machines

Tractors and slope mowers have fuel data per physical machine.

Record: - fuel consumed during the shift/use - amount refuelled

Consumption is a manually recorded operational value and is not assumed
to equal refuelling.

## Brushcutters

Brushcutter fuel is shared/global per ProjectDay rather than per
physical brushcutter.

Admin assigns one active Worker company-wide to record the group's fuel
consumption and refuelling per open project/day (ADR-022). No self-claiming.

Data ownership: - ProjectDay owns the fuel record. - Employee is only
`recorded_by`.

Only Admin may reassign/remove the recorder, with reason and audit.

Prevent duplicate active brushcutter fuel records for the same
project/day/category.

ADR-022 supersedes ADR-010/014 fuel write access: current Leader reads but
cannot edit shared fuel; designated Worker has fuel-only access; Admin retains
corrections. Assignment does not change historical attribution. Other Workers
and Accountant have no shared fuel access. ADR-014 defines atomic Admin daily metadata/fuel saves and audited
clearing: both numeric values explicitly null clear an existing row, while
zero remains a valid value. Cleared rows keep their identity and audit but
are excluded from operational fuel reports. Reentry reactivates the same row.
