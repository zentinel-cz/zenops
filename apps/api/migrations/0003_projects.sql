create table projects (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null check (length(trim(name)) >= 2),
  location text not null check (length(trim(location)) >= 2),
  besip boolean not null default false,
  current_leader_employee_id uuid not null references employees(id),
  start_date date not null,
  end_date date,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  note text,
  created_by_user_id uuid not null references users(id),
  closed_at timestamptz,
  closed_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_code_normalized check (code = upper(trim(code))),
  constraint projects_dates_valid check (end_date is null or end_date >= start_date),
  constraint projects_close_state_valid check (
    (status = 'OPEN' and closed_at is null and closed_by_user_id is null)
    or (status = 'CLOSED' and closed_at is not null and closed_by_user_id is not null)
  )
);
create unique index projects_code_unique on projects (upper(code));
create index projects_open_idx on projects (start_date, code) where status = 'OPEN';
create index projects_leader_idx on projects (current_leader_employee_id, status);

create table project_leader_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  leader_employee_id uuid not null references employees(id),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  changed_by_user_id uuid not null references users(id),
  constraint project_leader_history_interval check (effective_to is null or effective_to > effective_from)
);
create unique index project_one_current_leader_history
  on project_leader_history (project_id) where effective_to is null;
