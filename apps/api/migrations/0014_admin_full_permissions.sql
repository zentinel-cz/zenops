-- Admin has every permission currently registered in the system.
-- auth.ts also resolves all permissions dynamically for Admin so new
-- permission-gated features are available without a role-specific grant.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.code = 'ADMIN'
on conflict (role_id, permission_id) do nothing;
