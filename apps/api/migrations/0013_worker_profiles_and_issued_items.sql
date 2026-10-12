alter table roles drop constraint roles_code_check;
alter table roles add constraint roles_code_check
  check (code in ('ADMIN', 'LEADER', 'WORKER', 'ACCOUNTANT'));

insert into roles (code, name) values ('ACCOUNTANT', 'Účetní');

insert into permissions (code, description) values
  ('employee.profile.own.read', 'Zobrazení vlastního profilu pracovníka'),
  ('employee.profile.manage', 'Správa profilů pracovníků'),
  ('employee.items.manage', 'Správa katalogu a evidence vydaných věcí');

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permissions p
where
  (r.code = 'WORKER' and p.code = 'employee.profile.own.read')
  or (r.code = 'ACCOUNTANT' and p.code in ('employee.profile.manage', 'employee.items.manage'))
  or (r.code = 'ADMIN' and p.code in ('employee.profile.manage', 'employee.items.manage'));

alter table employees
  add column contact_phone text,
  add column upper_workwear_size text,
  add column lower_workwear_size text,
  add column shoe_size text,
  add constraint employees_contact_phone_length check (contact_phone is null or length(trim(contact_phone)) between 1 and 40),
  add constraint employees_upper_workwear_size_length check (upper_workwear_size is null or length(trim(upper_workwear_size)) between 1 and 40),
  add constraint employees_lower_workwear_size_length check (lower_workwear_size is null or length(trim(lower_workwear_size)) between 1 and 40),
  add constraint employees_shoe_size_length check (shoe_size is null or length(trim(shoe_size)) between 1 and 40);

create table issued_item_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 120),
  is_active boolean not null default true,
  created_by_user_id uuid not null references users(id),
  updated_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table employee_item_issues (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  item_type_id uuid not null references issued_item_types(id),
  item_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  size text check (size is null or length(trim(size)) between 1 and 40),
  issued_on date not null,
  note text check (note is null or length(note) <= 1000),
  created_by_user_id uuid not null references users(id),
  updated_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employee_item_issues_employee_date_idx
  on employee_item_issues (employee_id, issued_on desc, created_at desc);

create table employee_item_returns (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references employee_item_issues(id),
  quantity integer not null check (quantity > 0),
  returned_on date not null,
  note text check (note is null or length(note) <= 1000),
  recorded_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index employee_item_returns_issue_date_idx
  on employee_item_returns (issue_id, returned_on, created_at);

create function validate_employee_item_return_quantity()
returns trigger
language plpgsql
as $$
declare
  issued_quantity integer;
  already_returned integer;
begin
  select quantity into issued_quantity
  from employee_item_issues where id = new.issue_id for update;

  if issued_quantity is null then
    raise exception using errcode = '23503', message = 'issued item record not found';
  end if;

  select coalesce(sum(quantity), 0)::integer into already_returned
  from employee_item_returns where issue_id = new.issue_id;

  if already_returned + new.quantity > issued_quantity then
    raise exception using errcode = '23514', message = 'returned quantity exceeds issued quantity';
  end if;
  return new;
end;
$$;

create trigger employee_item_return_quantity_valid
before insert on employee_item_returns
for each row execute function validate_employee_item_return_quantity();

create function prevent_issue_quantity_below_returns()
returns trigger
language plpgsql
as $$
declare
  already_returned integer;
begin
  select coalesce(sum(quantity), 0)::integer into already_returned
  from employee_item_returns where issue_id = new.id;
  if already_returned > new.quantity then
    raise exception using errcode = '23514', message = 'issued quantity is below already returned quantity';
  end if;
  return new;
end;
$$;

create trigger employee_item_issue_quantity_valid
before update of quantity on employee_item_issues
for each row execute function prevent_issue_quantity_below_returns();

create function prevent_employee_item_return_history_change()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = '23514', message = 'employee item return history is append-only';
end;
$$;

create trigger employee_item_returns_immutable
before update or delete on employee_item_returns
for each row execute function prevent_employee_item_return_history_change();

comment on table employee_item_issues is 'Append-preserving employee issue records; corrections require an audit reason.';
comment on table employee_item_returns is 'Dated partial or complete returns; return history is append-only.';
