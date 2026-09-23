# Vehicles

Vehicles are separate from work machines.

## Shared transport

Multiple employees may travel in one vehicle.

One employee records themselves as `DRIVER`. Other employees may record
themselves as `PASSENGER`.

Only the driver owns the operational vehicle record for that trip/day
context and records relevant mileage/fuel data. This prevents duplicate
consumption.

V1 should keep the passenger workflow simple. The data model should
allow a passenger to reference the same vehicle/trip without duplicating
operational values.

Vehicle catalogue management: Admin and Leader.
