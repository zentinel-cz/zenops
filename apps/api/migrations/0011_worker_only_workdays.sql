delete from role_permissions rp using roles r, permissions p
where rp.role_id = r.id and rp.permission_id = p.id
  and r.code in ('ADMIN', 'LEADER')
  and p.code in ('workday.own.manage', 'workday.own.submit');
