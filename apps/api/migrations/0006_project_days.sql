create table project_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  work_date date not null,
  weather text,
  temperature_c numeric(5,2),
  note text,
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, work_date),
  check (temperature_c is null or temperature_c between -60 and 60)
);
create index project_days_date_idx on project_days (work_date desc, project_id);

alter table work_entries add column project_day_id uuid not null references project_days(id);
create index work_entries_project_day_idx on work_entries (project_day_id, state);
