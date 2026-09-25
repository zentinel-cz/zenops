create table machine_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tracks_mth boolean not null default true,
  created_at timestamptz not null default now()
);
create table machines (
  id uuid primary key default gen_random_uuid(),
  machine_type_id uuid not null references machine_types(id),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(trim(code)))
);
create table attachment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  uniquely_tracked boolean not null default true,
  created_at timestamptz not null default now()
);
create table attachments (
  id uuid primary key default gen_random_uuid(),
  attachment_type_id uuid not null references attachment_types(id),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (code = upper(trim(code)))
);
create table machine_usages (
  id uuid primary key default gen_random_uuid(),
  work_entry_id uuid not null unique references work_entries(id) on delete cascade,
  machine_id uuid not null references machines(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  suggested_start_mth numeric(12,2),
  entered_start_mth numeric(12,2),
  end_mth numeric(12,2),
  fuel_consumed numeric(12,2),
  fuel_refuelled numeric(12,2),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  check (entered_start_mth is null or entered_start_mth >= 0),
  check (end_mth is null or end_mth >= entered_start_mth),
  check (fuel_consumed is null or fuel_consumed >= 0),
  check (fuel_refuelled is null or fuel_refuelled >= 0),
  exclude using gist (machine_id with =, tstzrange(start_at, end_at, '[)') with &&)
);
create index machine_usages_latest_mth on machine_usages (machine_id, end_at desc) where end_mth is not null;

create table attachment_usages (
  id uuid primary key default gen_random_uuid(),
  machine_usage_id uuid not null references machine_usages(id) on delete cascade,
  work_entry_id uuid not null references work_entries(id) on delete cascade,
  attachment_id uuid not null references attachments(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (work_entry_id, attachment_id),
  check (end_at > start_at),
  exclude using gist (attachment_id with =, tstzrange(start_at, end_at, '[)') with &&)
);
