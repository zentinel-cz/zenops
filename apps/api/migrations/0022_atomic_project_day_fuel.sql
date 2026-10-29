alter table project_fuel_records
  add column cleared_at timestamptz,
  add column cleared_by_user_id uuid references users(id);
alter table project_fuel_records drop constraint project_fuel_records_check;
alter table project_fuel_records add constraint project_fuel_records_values_state check (
  (cleared_at is null and cleared_by_user_id is null and (fuel_consumed is not null or fuel_refuelled is not null))
  or (cleared_at is not null and cleared_by_user_id is not null and fuel_consumed is null and fuel_refuelled is null)
);

create function prevent_project_fuel_delete() returns trigger language plpgsql as $$
begin
  raise exception using errcode='ZF001', message='Project fuel history must be retained; clear the values through an audited correction';
end;
$$;
create trigger project_fuel_history_guard before delete on project_fuel_records
  for each row execute function prevent_project_fuel_delete();
