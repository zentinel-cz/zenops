create table vehicles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  registration_number text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(trim(code))),
  check (registration_number = upper(trim(registration_number)))
);

create table vehicle_trips (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  driver_work_day_id uuid not null references work_days(id) on delete cascade,
  driver_employee_id uuid not null references employees(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  start_odometer_km numeric(12,1) not null,
  end_odometer_km numeric(12,1) not null,
  fuel_consumed numeric(12,2),
  fuel_refuelled numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (start_odometer_km >= 0 and end_odometer_km >= start_odometer_km),
  check (fuel_consumed is null or fuel_consumed >= 0),
  check (fuel_refuelled is null or fuel_refuelled >= 0),
  exclude using gist (vehicle_id with =, tstzrange(start_at, end_at, '[)') with &&)
);
create index vehicle_trips_driver_date_idx on vehicle_trips (driver_employee_id, start_at desc);

create table vehicle_trip_participants (
  vehicle_trip_id uuid not null references vehicle_trips(id) on delete cascade,
  employee_id uuid not null references employees(id),
  role text not null check (role in ('DRIVER', 'PASSENGER')),
  created_at timestamptz not null default now(),
  primary key (vehicle_trip_id, employee_id)
);
create unique index vehicle_trip_one_driver on vehicle_trip_participants (vehicle_trip_id) where role = 'DRIVER';

create or replace function validate_vehicle_trip_driver()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from work_days wd where wd.id = new.driver_work_day_id and wd.employee_id = new.driver_employee_id
  ) then raise exception using errcode = '23514', message = 'vehicle trip driver must own work day'; end if;
  return new;
end;
$$;
create trigger vehicle_trip_driver_check before insert or update on vehicle_trips
  for each row execute function validate_vehicle_trip_driver();
