-- Enforce BR-043 at the system of record, including direct writes and concurrent closure.
create function guard_operational_period()
returns trigger language plpgsql as $$
declare
  data jsonb;
  operation_date date;
  period_state text;
begin
  for data in select value from jsonb_array_elements(
    case when tg_op='UPDATE' then jsonb_build_array(to_jsonb(old),to_jsonb(new))
    when tg_op='DELETE' then jsonb_build_array(to_jsonb(old)) else jsonb_build_array(to_jsonb(new)) end)
  loop
  operation_date := null;
  if tg_table_name in ('work_days', 'project_days') then
    operation_date := (data->>'work_date')::date;
  elsif tg_table_name in ('work_entries', 'break_entries') then
    select work_date into operation_date from work_days where id=(data->>'work_day_id')::uuid;
  elsif tg_table_name in ('machine_usages', 'attachment_usages', 'approvals') then
    select wd.work_date into operation_date from work_entries we join work_days wd on wd.id=we.work_day_id
      where we.id=(data->>'work_entry_id')::uuid;
  elsif tg_table_name = 'vehicle_trips' then
    select work_date into operation_date from work_days where id=(data->>'driver_work_day_id')::uuid;
  elsif tg_table_name = 'vehicle_trip_participants' then
    select wd.work_date into operation_date from vehicle_trips vt join work_days wd on wd.id=vt.driver_work_day_id
      where vt.id=(data->>'vehicle_trip_id')::uuid;
  elsif tg_table_name = 'project_fuel_records' then
    select work_date into operation_date from project_days where id=(data->>'project_day_id')::uuid;
  end if;
  -- Cascades may no longer see the parent. The parent delete was guarded first.
  if operation_date is not null then
    insert into monthly_periods(month_start) values(date_trunc('month', operation_date)::date)
      on conflict(month_start) do nothing;
    select state into period_state from monthly_periods
      where month_start=date_trunc('month', operation_date)::date for share;
    if period_state = 'CLOSED' then
      raise exception using errcode='55000', message='Uzavřený měsíc nelze měnit. Nejprve jej znovu otevřete.';
    end if;
  end if;
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['work_days','work_entries','break_entries','machine_usages',
    'attachment_usages','vehicle_trips','vehicle_trip_participants','project_days','project_fuel_records','approvals']
  loop
    execute format('create trigger operational_period_guard before insert or update or delete on %I for each row execute function guard_operational_period()', table_name);
  end loop;
end;
$$;

-- Keep physical-resource occupancy aligned with corrected work intervals.
create function sync_corrected_work_interval()
returns trigger language plpgsql as $$
begin
  update machine_usages set start_at=new.start_at, end_at=new.end_at where work_entry_id=new.id;
  update attachment_usages set start_at=new.start_at, end_at=new.end_at where work_entry_id=new.id;
  return new;
end;
$$;
create trigger work_entry_sync_resource_interval after update of start_at, end_at on work_entries
  for each row when (old.start_at is distinct from new.start_at or old.end_at is distinct from new.end_at)
  execute function sync_corrected_work_interval();
