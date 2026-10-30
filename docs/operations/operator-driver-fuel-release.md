# Operator and driver fuel release

Deploy API and web together with the standard ZenOps release procedure and
forward migration 0024. Verify a database backup and source bundle first.
Existing machine operator ownership and Admin-only audited correction
permissions are retained. The user guide and ADR-016 define the workflow.

## Migration

0024 checks that every existing trip has exactly its recorded driver in
vehicle_trip_participants and that the driver is not also a passenger.
Inconsistent history stops the migration for audited repair; nothing is
automatically reassigned or deleted. Deferred constraints then preserve this
invariant across trip and participant writes, including direct database
writes. Trip creation and initial memberships remain one transaction.

Preflight (must return zero):

```sql
select count(*) from vehicle_trips vt
where (select count(*) from vehicle_trip_participants p
  where p.vehicle_trip_id=vt.id and p.role='DRIVER'
    and p.employee_id=vt.driver_employee_id)<>1
or exists(select 1 from vehicle_trip_participants p where p.vehicle_trip_id=vt.id
  and ((p.role='DRIVER' and p.employee_id<>vt.driver_employee_id)
    or (p.role='PASSENGER' and p.employee_id=vt.driver_employee_id)));
```

The passenger endpoint accepts only an empty body and derives membership from
the authenticated Worker. It locks both WorkDays in UUID order, checks matching
dates/editable states/open periods and locks the trip before inserting.
Repeat joins have no duplicate membership or audit. Passenger references do
not create additional mileage/fuel rows. Existing project-scoped report
behavior is unchanged; project allocation remains a separate question.

## Local verification

- 60 API tests including 49 PostgreSQL integrations; 4 shared tests.
- Type checks and API/web production builds.
- Two passengers join concurrently, one driver and one trip remain, repeat
  join is idempotent, monthly kilometres/fuel count once.
- Passenger cannot submit fuel in the join body, use the Admin correction
  endpoint, create an overlapping competing trip or write into a driver's
  WorkDay. Wrong dates, roles, missing Origin and submitted driver days are
  rejected. The trip picker omits fuel and unrelated notes.
- Operator-only machine fuel, direct driver deletion/role substitution
  rejection, historical migration preflight and preservation of source rows.
- Real Edge: explicit driver checkbox, two passenger sessions with no fuel/km
  inputs, failed-join selection retention, independent tractor fuel and
  once-only car/tractor totals. Layout checked at 320/390/768/1440 pixels.
