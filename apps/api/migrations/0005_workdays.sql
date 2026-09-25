create extension if not exists btree_gist;

create table monthly_periods (
  id uuid primary key default gen_random_uuid(),
  month_start date not null unique,
  state text not null default 'OPEN' check (state in ('OPEN', 'CLOSED')),
  closed_at timestamptz,
  closed_by_user_id uuid references users(id),
  reopened_at timestamptz,
  reopened_by_user_id uuid references users(id),
  reopen_reason text,
  created_at timestamptz not null default now(),
  constraint monthly_period_first_day check (month_start = date_trunc('month', month_start)::date),
  constraint monthly_period_close_state check (
    (state = 'OPEN' and closed_at is null and closed_by_user_id is null)
    or (state = 'CLOSED' and closed_at is not null and closed_by_user_id is not null)
  )
);

create table work_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  requires_activity boolean not null default false,
  is_active boolean not null default true
);
create table work_activities (
  id uuid primary key default gen_random_uuid(),
  work_type_id uuid not null references work_types(id),
  code text not null,
  name text not null,
  is_active boolean not null default true,
  unique (work_type_id, code)
);

create table work_days (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  monthly_period_id uuid not null references monthly_periods(id),
  work_date date not null,
  shift_type text not null check (shift_type in ('MORNING', 'NIGHT')),
  state text not null default 'DRAFT' check (state in ('DRAFT', 'SUBMITTED', 'PARTIALLY_APPROVED', 'APPROVED', 'RETURNED')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index work_days_employee_date_idx on work_days (employee_id, work_date desc);

create table work_entries (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references work_days(id) on delete cascade,
  project_id uuid not null references projects(id),
  work_type_id uuid not null references work_types(id),
  work_activity_id uuid references work_activities(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text,
  state text not null default 'DRAFT' check (state in ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  exclude using gist (work_day_id with =, tstzrange(start_at, end_at, '[)') with &&)
);

create table break_entries (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid not null references work_days(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  exclude using gist (work_day_id with =, tstzrange(start_at, end_at, '[)') with &&)
);

create or replace function prevent_cross_interval_overlap()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.work_day_id::text, 0));
  if tg_table_name = 'work_entries' and exists (
    select 1 from break_entries b where b.work_day_id = new.work_day_id
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then raise exception using errcode = '23P01', message = 'work interval overlaps a break'; end if;
  if tg_table_name = 'break_entries' and exists (
    select 1 from work_entries w where w.work_day_id = new.work_day_id
      and tstzrange(w.start_at, w.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then raise exception using errcode = '23P01', message = 'break overlaps work'; end if;
  return new;
end;
$$;
create trigger work_entries_cross_overlap before insert or update on work_entries
  for each row execute function prevent_cross_interval_overlap();
create trigger break_entries_cross_overlap before insert or update on break_entries
  for each row execute function prevent_cross_interval_overlap();

insert into work_types (code, name, requires_activity) values
  ('MACHINE_MOWING', 'Strojní sečení', false),
  ('BRUSHCUTTER', 'Křovinořez', false),
  ('TREE_CUTTING', 'Kácení', true),
  ('REPROFILING', 'Reprofilace', false),
  ('OTHER', 'Ostatní', false);
insert into work_activities (work_type_id, code, name)
select wt.id, activity.code, activity.name from work_types wt
cross join (values
  ('SAWYER', 'Pilař'), ('TRACTOR_DRIVER', 'Řidič traktoru'), ('HANDLING', 'Manipulace'),
  ('CLEANUP', 'Úklid'), ('OTHER', 'Ostatní')
) as activity(code, name) where wt.code = 'TREE_CUTTING';
