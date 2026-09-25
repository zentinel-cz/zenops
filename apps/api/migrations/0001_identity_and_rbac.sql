create extension if not exists pgcrypto;

create table employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text not null unique,
  display_name text not null check (length(trim(display_name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references employees(id),
  email text not null,
  password_hash text not null,
  is_active boolean not null default true,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized check (email = lower(trim(email)))
);
create unique index users_email_unique on users (lower(email));

create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('ADMIN', 'LEADER', 'WORKER')),
  name text not null,
  created_at timestamptz not null default now()
);
create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);
create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint sessions_expiry_after_creation check (expires_at > created_at)
);
create index sessions_active_user_idx on sessions (user_id, expires_at) where revoked_at is null;

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on audit_logs (actor_user_id, created_at desc);

insert into roles (code, name) values
  ('ADMIN', 'Administrátor'), ('LEADER', 'Vedoucí'), ('WORKER', 'Pracovník');
insert into permissions (code, description) values
  ('workday.own.manage', 'Správa vlastních pracovních dnů'),
  ('workday.own.submit', 'Odeslání vlastní práce ke schválení'),
  ('project.read_open', 'Zobrazení otevřených projektů'),
  ('project.create', 'Vytvoření projektu'),
  ('project.close', 'Uzavření a znovuotevření projektu'),
  ('project_day.manage', 'Správa denního kontextu projektu'),
  ('asset.manage', 'Správa strojů, příslušenství a vozidel'),
  ('fuel.manage', 'Správa provozních záznamů paliva'),
  ('approval.project.manage', 'Schvalování práce vlastních projektů'),
  ('approval.admin.manage', 'Administrativní schvalování'),
  ('employee.manage', 'Správa zaměstnanců a uživatelů'),
  ('period.manage', 'Uzavření a znovuotevření měsíce'),
  ('report.scoped.read', 'Provozní reporty ve vlastním rozsahu'),
  ('report.global.read', 'Globální provozní reporty'),
  ('audit.read', 'Zobrazení auditní stopy');
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where
  (r.code = 'WORKER' and p.code in ('workday.own.manage', 'workday.own.submit', 'project.read_open'))
  or (r.code = 'LEADER' and p.code in ('workday.own.manage', 'workday.own.submit', 'project.read_open', 'project.create', 'project_day.manage', 'asset.manage', 'fuel.manage', 'approval.project.manage', 'report.scoped.read'))
  or r.code = 'ADMIN';

comment on table audit_logs is 'Append-only application audit trail.';
