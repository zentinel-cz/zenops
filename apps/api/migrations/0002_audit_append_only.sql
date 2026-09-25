create or replace function prevent_audit_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger audit_logs_no_update
before update or delete on audit_logs
for each row execute function prevent_audit_log_mutation();
