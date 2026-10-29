alter table machine_usages drop constraint machine_usages_work_entry_id_key;
alter table machine_usages add constraint machine_usages_entry_machine_key unique(work_entry_id,machine_id);

create function work_entry_machine_usages(entry_id uuid) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',mu.id,'machineId',m.id,'machineCode',m.code,'machineName',m.name,
    'startMth',mu.entered_start_mth::text,'endMth',mu.end_mth::text,
    'fuelConsumed',mu.fuel_consumed::text,'fuelRefuelled',mu.fuel_refuelled::text,
    'attachments',coalesce((select jsonb_agg(a.code order by a.code,a.id)
      from attachment_usages au join attachments a on a.id=au.attachment_id where au.machine_usage_id=mu.id),'[]'::jsonb),
    'attachmentIds',coalesce((select jsonb_agg(au.attachment_id order by au.attachment_id)
      from attachment_usages au where au.machine_usage_id=mu.id),'[]'::jsonb)
  ) order by m.code,mu.id),'[]'::jsonb)
  from machine_usages mu join machines m on m.id=mu.machine_id where mu.work_entry_id=entry_id;
$$;
