-- Preserve existing usage and activity identities, including approved history.
alter table machine_usages add column note text check (char_length(note) <= 2000);
update work_activities set name='Strojník' where code='TRACTOR_DRIVER';
update work_activities set is_active=false where code in ('HANDLING','OTHER')
  and work_type_id=(select id from work_types where code='TREE_CUTTING');
insert into work_activities(work_type_id,code,name)
  select id,'POLE_SAW','Tyčová pila' from work_types where code='TREE_CUTTING';

create or replace function work_entry_machine_usages(entry_id uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'note',mu.note,'id',mu.id,'machineId',m.id,'machineCode',m.code,'machineName',m.name,
    'startMth',mu.entered_start_mth::text,'endMth',mu.end_mth::text,
    'fuelConsumed',mu.fuel_consumed::text,'fuelRefuelled',mu.fuel_refuelled::text,
    'attachments',coalesce((select jsonb_agg(a.code order by a.code,a.id)
      from attachment_usages au join attachments a on a.id=au.attachment_id where au.machine_usage_id=mu.id),'[]'::jsonb),
    'attachmentIds',coalesce((select jsonb_agg(au.attachment_id order by au.attachment_id)
      from attachment_usages au where au.machine_usage_id=mu.id),'[]'::jsonb)
  ) order by m.code,mu.id),'[]'::jsonb)
  from machine_usages mu join machines m on m.id=mu.machine_id where mu.work_entry_id=entry_id;
$$;
