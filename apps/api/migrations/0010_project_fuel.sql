create table project_fuel_records (
  id uuid primary key default gen_random_uuid(),
  project_day_id uuid not null references project_days(id),
  category text not null check (category in ('BRUSHCUTTER')),
  fuel_consumed numeric(12,2),
  fuel_refuelled numeric(12,2),
  recorded_by_employee_id uuid not null references employees(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_day_id, category),
  check (fuel_consumed is null or fuel_consumed >= 0),
  check (fuel_refuelled is null or fuel_refuelled >= 0),
  check (fuel_consumed is not null or fuel_refuelled is not null)
);
create index project_fuel_records_recorder_idx on project_fuel_records (recorded_by_employee_id, created_at desc);
