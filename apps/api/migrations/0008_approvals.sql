create table approvals (
  id uuid primary key default gen_random_uuid(),
  work_entry_id uuid not null references work_entries(id),
  action text not null check (action in ('APPROVED', 'RETURNED')),
  approver_employee_id uuid not null references employees(id),
  reason text,
  created_at timestamptz not null default now(),
  check ((action = 'RETURNED' and length(trim(reason)) >= 3) or (action = 'APPROVED' and reason is null))
);
create index approvals_entry_history_idx on approvals (work_entry_id, created_at desc);
create index approvals_approver_idx on approvals (approver_employee_id, created_at desc);

create or replace function prevent_approval_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Approval events are append-only';
end;
$$;

create trigger approvals_prevent_update
before update on approvals for each row execute function prevent_approval_mutation();

create trigger approvals_prevent_delete
before delete on approvals for each row execute function prevent_approval_mutation();
