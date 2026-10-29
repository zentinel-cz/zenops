alter table work_days drop constraint work_days_state_check;
alter table work_days add constraint work_days_state_check
  check (state in ('DRAFT','SUBMITTED','PARTIALLY_APPROVED','APPROVED','RETURNED','CANCELLED'));
alter table work_days
  add column cancelled_at timestamptz,
  add column cancelled_by_user_id uuid references users(id),
  add column cancellation_reason text,
  add constraint work_days_cancellation_metadata check (
    (state='CANCELLED' and cancelled_at is not null and cancelled_by_user_id is not null
      and cancellation_reason is not null and length(trim(cancellation_reason)) between 3 and 500)
    or (state<>'CANCELLED' and cancelled_at is null and cancelled_by_user_id is null and cancellation_reason is null)
  );

create function workday_is_empty(day_id uuid) returns boolean language sql as $$
  select not exists(select 1 from work_entries where work_day_id=day_id)
    and not exists(select 1 from break_entries where work_day_id=day_id)
    and not exists(select 1 from vehicle_trips where driver_work_day_id=day_id);
$$;

create function guard_empty_workday_transition() returns trigger language plpgsql as $$
declare
  actor_id uuid;
  actor_employee_id uuid;
  actor_role text;
  change_reason text;
begin
  if tg_op='DELETE' then
    if old.state='CANCELLED' or exists(select 1 from audit_logs where entity_type='WORK_DAY' and entity_id=old.id and action='WORKDAY_CANCELLED') then
      raise exception using errcode='ZC001', message='Cancelled WorkDay history cannot be deleted';
    end if;
    return old;
  end if;
  if tg_op='INSERT' then
    if new.state='CANCELLED' then raise exception using errcode='ZC001', message='Create a draft before cancellation'; end if;
    return new;
  end if;
  if old.state<>'CANCELLED' and new.state<>'CANCELLED' then return new; end if;
  if old.state=new.state then
    if new is distinct from old then raise exception using errcode='ZC001', message='Cancelled WorkDay cannot be edited'; end if;
    return new;
  end if;
  if old.submitted_at is not null or new.submitted_at is not null or not workday_is_empty(old.id)
    or (new.state='CANCELLED' and old.state<>'DRAFT')
    or (old.state='CANCELLED' and new.state<>'DRAFT') then
    raise exception using errcode='ZC001', message='Only an empty, never submitted draft can be cancelled or restored';
  end if;
  actor_id:=nullif(current_setting('zenops.actor_user_id',true),'')::uuid;
  change_reason:=nullif(trim(current_setting('zenops.change_reason',true)),'');
  select u.employee_id,r.code into actor_employee_id,actor_role
    from users u join employees e on e.id=u.employee_id
    join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id
    where u.id=actor_id and u.is_active and e.is_active;
  if change_reason is null or length(change_reason) not between 3 and 500 or actor_role is null
    or not ((actor_role='WORKER' and actor_employee_id=old.employee_id)
      or (actor_role='ADMIN' and new.state='CANCELLED')) then
    raise exception using errcode='ZC002', message='Cancellation or restoration requires an authorized actor and a reason';
  end if;
  if new.state='CANCELLED' then
    new.shift_type:=old.shift_type;
    new.cancelled_at:=clock_timestamp();
    new.cancelled_by_user_id:=actor_id;
    new.cancellation_reason:=change_reason;
  else
    new.cancelled_at:=null;
    new.cancelled_by_user_id:=null;
    new.cancellation_reason:=null;
  end if;
  new.updated_at:=now();
  insert into audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,reason)
    values(actor_id,case when new.state='CANCELLED' then 'WORKDAY_CANCELLED' else 'WORKDAY_RESTORED' end,
      'WORK_DAY',old.id,to_jsonb(old),to_jsonb(new),change_reason);
  return new;
end;
$$;
create trigger workday_cancellation_guard before insert or update or delete on work_days
  for each row execute function guard_empty_workday_transition();

create function guard_cancelled_workday_insert() returns trigger language plpgsql as $$
declare
  day_id uuid;
  day_state text;
begin
  if tg_table_name='vehicle_trips' then day_id:=new.driver_work_day_id; else day_id:=new.work_day_id; end if;
  select state into day_state from work_days where id=day_id for update;
  if day_state='CANCELLED' then raise exception using errcode='ZC001', message='Restore the cancelled WorkDay before adding records'; end if;
  return new;
end;
$$;
create trigger cancelled_workday_insert_guard before insert on work_entries for each row execute function guard_cancelled_workday_insert();
create trigger cancelled_workday_insert_guard before insert on break_entries for each row execute function guard_cancelled_workday_insert();
create trigger cancelled_workday_insert_guard before insert on vehicle_trips for each row execute function guard_cancelled_workday_insert();

create or replace function validate_shift_start_date() returns trigger language plpgsql as $$
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
  if day_state not in ('DRAFT','RETURNED','CANCELLED') then
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
