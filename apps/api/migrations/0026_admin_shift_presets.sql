alter table work_days drop constraint work_days_shift_type_check;
alter table work_days add constraint work_days_shift_type_check
  check (shift_type in ('MORNING','AFTERNOON','NIGHT'));

insert into permissions(code,description) values('settings.manage','Správa nastavení směn');
insert into role_permissions(role_id,permission_id)
  select r.id,p.id from roles r cross join permissions p where r.code='ADMIN' and p.code='settings.manage';

create table operational_settings (
  id integer primary key check (id=1),
  version integer not null default 0 check (version>=0)
);
insert into operational_settings(id) values(1);
create table shift_presets (
  shift_type text primary key check (shift_type in ('MORNING','AFTERNOON','NIGHT')),
  start_time time(0),
  end_time time(0),
  check ((start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and start_time<>end_time))
);
-- No company hours are invented; Admin supplies the actual presets.
insert into shift_presets(shift_type) values('MORNING'),('AFTERNOON'),('NIGHT');

