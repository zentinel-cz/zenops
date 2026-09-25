alter table employees
  add column deactivated_at timestamptz,
  add column deactivated_by_user_id uuid references users(id);

alter table users
  add column deactivated_at timestamptz,
  add column deactivated_by_user_id uuid references users(id);

alter table employees add constraint employees_active_state_valid check (
  (is_active and deactivated_at is null and deactivated_by_user_id is null)
  or (not is_active and deactivated_at is not null and deactivated_by_user_id is not null)
);

alter table users add constraint users_active_state_valid check (
  (is_active and deactivated_at is null and deactivated_by_user_id is null)
  or (not is_active and deactivated_at is not null and deactivated_by_user_id is not null)
);
