-- A single company-wide delegate; fuel remains owned by project/day.
alter table operational_settings add column brushcutter_recorder_employee_id uuid references employees(id);
alter table operational_settings add column fuel_recorder_version integer not null default 0 check (fuel_recorder_version>=0);
