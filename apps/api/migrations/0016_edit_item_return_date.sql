update permissions set description = 'Prohlížení všech uživatelů a správa profilů pracovníků'
where code = 'employee.profile.manage';

update permissions set description = 'Správa katalogu a evidence vydaných věcí pro všechny uživatele'
where code = 'employee.items.manage';

create or replace function prevent_employee_item_return_history_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '23514', message = 'employee item return history cannot be deleted';
  end if;

  if row(new.id, new.issue_id, new.quantity, new.note, new.recorded_by_user_id, new.created_at)
     is distinct from
     row(old.id, old.issue_id, old.quantity, old.note, old.recorded_by_user_id, old.created_at) then
    raise exception using errcode = '23514', message = 'only the return date may be corrected';
  end if;
  return new;
end;
$$;

comment on function prevent_employee_item_return_history_change() is
  'Return records cannot be deleted or otherwise changed; returned_on corrections are audited by the application.';
