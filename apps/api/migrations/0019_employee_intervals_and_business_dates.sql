lock table work_days, work_entries, break_entries, vehicle_trips in share row exclusive mode;

create table employee_time_intervals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  work_day_id uuid not null references work_days(id) on delete cascade,
  work_entry_id uuid unique references work_entries(id) on delete cascade,
  break_entry_id uuid unique references break_entries(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  check (num_nonnulls(work_entry_id, break_entry_id) = 1),
  check (end_at > start_at),
  exclude using gist (employee_id with =, tstzrange(start_at, end_at, '[)') with &&)
);

create index employee_time_intervals_workday on employee_time_intervals(work_day_id);

do $$
begin
  if exists (
    select 1 from (
      select wd.employee_id, we.id, we.start_at, we.end_at from work_entries we join work_days wd on wd.id=we.work_day_id
      union all
      select wd.employee_id, be.id, be.start_at, be.end_at from break_entries be join work_days wd on wd.id=be.work_day_id
    ) intervals join (
      select wd.employee_id, we.id, we.start_at, we.end_at from work_entries we join work_days wd on wd.id=we.work_day_id
      union all
      select wd.employee_id, be.id, be.start_at, be.end_at from break_entries be join work_days wd on wd.id=be.work_day_id
    ) other on intervals.employee_id=other.employee_id and intervals.id<other.id
      and tstzrange(intervals.start_at,intervals.end_at,'[)') && tstzrange(other.start_at,other.end_at,'[)')
  ) then
    raise exception 'Historical employee intervals overlap. Run ops/check-workday-times.sql and resolve through audited corrections before migration 0019.';
  end if;
  if exists (
    select 1 from (
      select work_day_id, start_at, end_at from work_entries
      union all select work_day_id, start_at, end_at from break_entries
      union all select driver_work_day_id, start_at, end_at from vehicle_trips
    ) intervals join work_days wd on wd.id=intervals.work_day_id
    where intervals.start_at < (wd.work_date::timestamp at time zone 'Europe/Prague')
       or intervals.end_at > ((wd.work_date+2)::timestamp at time zone 'Europe/Prague')
  ) then
    raise exception 'Historical intervals are outside their business dates. Run ops/check-workday-times.sql and resolve through audited corrections before migration 0019.';
  end if;
  if exists (
    select wd.id from work_days wd left join (
      select work_day_id, start_at from work_entries
      union all select work_day_id, start_at from break_entries
      union all select driver_work_day_id, start_at from vehicle_trips
    ) intervals on intervals.work_day_id=wd.id
    where wd.state not in ('DRAFT','RETURNED') group by wd.id
    having min(intervals.start_at) is null or (min(intervals.start_at) at time zone 'Europe/Prague')::date<>wd.work_date
  ) then
    raise exception 'Historical shifts do not start on their business date. Run ops/check-workday-times.sql and resolve through audited corrections before migration 0019.';
  end if;
end;
$$;

insert into employee_time_intervals(employee_id,work_day_id,work_entry_id,start_at,end_at)
select wd.employee_id,wd.id,we.id,we.start_at,we.end_at from work_entries we join work_days wd on wd.id=we.work_day_id;
insert into employee_time_intervals(employee_id,work_day_id,break_entry_id,start_at,end_at)
select wd.employee_id,wd.id,be.id,be.start_at,be.end_at from break_entries be join work_days wd on wd.id=be.work_day_id;

create function validate_workday_interval_date() returns trigger language plpgsql as $$
declare
  day_id uuid;
  day_date date;
begin
  if tg_table_name='vehicle_trips' then day_id:=new.driver_work_day_id; else day_id:=new.work_day_id; end if;
  if tg_op='UPDATE' then
    if tg_table_name='vehicle_trips' then
      if old.driver_work_day_id<>new.driver_work_day_id then raise exception using errcode='ZT001', message='Trip WorkDay is immutable'; end if;
    elsif old.work_day_id<>new.work_day_id then
      raise exception using errcode='ZT001', message='Interval WorkDay is immutable';
    end if;
  end if;
  select work_date into day_date from work_days where id=day_id;
  if new.start_at < (day_date::timestamp at time zone 'Europe/Prague')
     or new.end_at > ((day_date+2)::timestamp at time zone 'Europe/Prague') then
    raise exception using errcode='ZT001', message='Interval must belong to the business date or its following day';
  end if;
  return new;
end;
$$;

create trigger work_entry_business_date before insert or update on work_entries for each row execute function validate_workday_interval_date();
create trigger break_entry_business_date before insert or update on break_entries for each row execute function validate_workday_interval_date();
create trigger vehicle_trip_business_date before insert or update on vehicle_trips for each row execute function validate_workday_interval_date();

create function sync_employee_time_interval() returns trigger language plpgsql as $$
declare
  owner_id uuid;
begin
  select employee_id into owner_id from work_days where id=new.work_day_id;
  if tg_table_name='work_entries' then
    insert into employee_time_intervals(employee_id,work_day_id,work_entry_id,start_at,end_at)
    values(owner_id,new.work_day_id,new.id,new.start_at,new.end_at)
    on conflict(work_entry_id) do update set start_at=excluded.start_at,end_at=excluded.end_at;
  else
    insert into employee_time_intervals(employee_id,work_day_id,break_entry_id,start_at,end_at)
    values(owner_id,new.work_day_id,new.id,new.start_at,new.end_at)
    on conflict(break_entry_id) do update set start_at=excluded.start_at,end_at=excluded.end_at;
  end if;
  return new;
end;
$$;

create trigger work_entry_employee_interval after insert or update of start_at,end_at,work_day_id on work_entries for each row execute function sync_employee_time_interval();
create trigger break_entry_employee_interval after insert or update of start_at,end_at,work_day_id on break_entries for each row execute function sync_employee_time_interval();

create function guard_workday_identity() returns trigger language plpgsql as $$
begin
  if row(new.employee_id,new.work_date,new.monthly_period_id) is distinct from row(old.employee_id,old.work_date,old.monthly_period_id) then
    raise exception using errcode='ZT001', message='WorkDay employee, date and monthly period are immutable';
  end if;
  return new;
end;
$$;
create trigger workday_identity before update on work_days for each row execute function guard_workday_identity();

create function validate_shift_start_date() returns trigger language plpgsql as $$
declare
  day_id uuid;
  day_date date;
  day_state text;
  first_start timestamptz;
begin
  if tg_table_name='work_days' then day_id:=new.id;
  elsif tg_table_name='vehicle_trips' then
    if tg_op='DELETE' then day_id:=old.driver_work_day_id; else day_id:=new.driver_work_day_id; end if;
  else
    if tg_op='DELETE' then day_id:=old.work_day_id; else day_id:=new.work_day_id; end if;
  end if;
  select work_date,state into day_date,day_state from work_days where id=day_id;
  if day_state not in ('DRAFT','RETURNED') then
    select min(start_at) into first_start from (
      select start_at from employee_time_intervals where work_day_id=day_id
      union all select start_at from vehicle_trips where driver_work_day_id=day_id
    ) intervals;
    if first_start is null or (first_start at time zone 'Europe/Prague')::date<>day_date then
      raise exception using errcode='ZT002', message='The shift must start on its business date';
    end if;
  end if;
  return null;
end;
$$;

create constraint trigger workday_shift_start after insert or update on work_days deferrable initially deferred for each row execute function validate_shift_start_date();
create constraint trigger employee_interval_shift_start after insert or update or delete on employee_time_intervals deferrable initially deferred for each row execute function validate_shift_start_date();
create constraint trigger vehicle_trip_shift_start after insert or update or delete on vehicle_trips deferrable initially deferred for each row execute function validate_shift_start_date();
