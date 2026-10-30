# ADR-016: Operator-owned machine fuel and one driver per shared trip

Status: Accepted (user decision 2026-10-30)

Fuel consumption and refuelling belong to a physical machine/vehicle and
remain separate manually entered values. The operator who records a tractor
or other machine on their own WorkEntry records that MachineUsage's fuel.
Existing ownership checks and Admin-only audited corrections apply.

A shared car trip has one driver and any recorded passengers. The Worker
explicitly selects "Jsem řidič této jízdy" to create the trip under their own
WorkDay; the backend derives its driver from the authenticated owner.
Only that driver enters mileage and fuel. A passenger selects an existing
trip and adds only their own PASSENGER membership, without fuel or mileage.
The driver may also select passengers when initially creating the trip.
Repeated self-joining is idempotent and creates no duplicate audit event.

Passenger self-joining follows existing editable-day rules: both the owning
passenger WorkDay and driver WorkDay must be DRAFT/RETURNED, in the same
business date and an OPEN month. Submitted/approved historical membership
changes remain an Admin correction with a reason and audit. Both days are
locked in UUID order and the trip is locked before the membership write.

The available-trip picker exposes vehicle, driver and interval only.
It excludes the caller's own/already joined trips. Own history shows the role
and driver; the single trip remains the source for fuel/km reports, regardless
of how many WorkDays reference it. Passenger links do not become ownership of
the trip or block empty-day cancellation (ADR-012).

Migration 0024 checks historical memberships without rewriting them, then
adds deferred constraints: each trip must have exactly the driver named by
its driver_employee_id, and that employee cannot also be a passenger.
Existing one-driver uniqueness, WorkDay ownership and vehicle interval
exclusion remain active. Creating the trip and its memberships is atomic.

This decision does not assign trips or fuel to projects and does not
introduce allocation of shared travel costs.
