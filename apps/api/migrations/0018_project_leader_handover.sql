-- ADR-010: preserve assignment history while allowing Admin-only handover.
alter table project_leader_history add column change_reason text;

create or replace function prevent_project_leader_change()
returns trigger language plpgsql as $$
declare
  actor uuid;
  reason text;
  changed_at timestamptz;
begin
  if new.current_leader_employee_id is not distinct from old.current_leader_employee_id then return new; end if;
  actor := nullif(current_setting('zenops.actor_user_id', true), '')::uuid;
  reason := nullif(trim(current_setting('zenops.change_reason', true)), '');
  if reason is null or length(reason) < 3 or not exists (
    select 1 from users u join employees e on e.id=u.employee_id
    join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id
    where u.id=actor and u.is_active and e.is_active and r.code='ADMIN'
  ) then
    raise exception using errcode='42501', message='Project handover requires an active Admin and a reason';
  end if;
  perform e.id from employees e join users u on u.employee_id=e.id
    join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id
    where e.id=new.current_leader_employee_id and e.is_active and u.is_active and r.code='LEADER'
    for share of e,u;
  if not found then
    raise exception using errcode='23514', message='Replacement must be an active Leader';
  end if;
  select greatest(clock_timestamp(), coalesce(max(effective_from) + interval '1 microsecond', clock_timestamp()))
    into changed_at from project_leader_history where project_id=old.id;
  update project_leader_history set effective_to=changed_at where project_id=old.id and effective_to is null;
  insert into project_leader_history(project_id,leader_employee_id,effective_from,changed_by_user_id,change_reason)
    values(old.id,new.current_leader_employee_id,changed_at,actor,reason);
  insert into audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,reason)
    values(actor,'PROJECT_LEADER_CHANGED','PROJECT',old.id,
      jsonb_build_object('leaderEmployeeId',old.current_leader_employee_id),
      jsonb_build_object('leaderEmployeeId',new.current_leader_employee_id),reason);
  return new;
end;
$$;
