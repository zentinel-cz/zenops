create unique index user_roles_one_role_per_user
  on user_roles (user_id);

create function prevent_project_leader_change()
returns trigger
language plpgsql
as $$
begin
  if new.current_leader_employee_id is distinct from old.current_leader_employee_id then
    raise exception using
      errcode = '23514',
      message = 'project leader is immutable after project creation';
  end if;
  return new;
end;
$$;

create trigger projects_immutable_leader
before update of current_leader_employee_id on projects
for each row execute function prevent_project_leader_change();
