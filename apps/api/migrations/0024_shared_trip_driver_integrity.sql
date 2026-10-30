-- Stop on inconsistent history; never guess or replace a historical driver.
do $$
begin
  if exists (
    select 1 from vehicle_trips vt
    where (select count(*) from vehicle_trip_participants p where p.vehicle_trip_id=vt.id
      and p.role='DRIVER' and p.employee_id=vt.driver_employee_id) <> 1
    or exists(select 1 from vehicle_trip_participants p where p.vehicle_trip_id=vt.id
      and ((p.role='DRIVER' and p.employee_id<>vt.driver_employee_id)
        or (p.role='PASSENGER' and p.employee_id=vt.driver_employee_id)))
  ) then
    raise exception 'Historical trip driver membership is inconsistent; resolve with an audited correction before migration';
  end if;
end;
$$;

create function check_shared_trip_driver_integrity() returns trigger language plpgsql as $$
declare
  trip_ids uuid[];
  trip_id uuid;
  driver_id uuid;
begin
  if tg_table_name='vehicle_trips' then
    if tg_op='INSERT' then trip_ids:=array[new.id];
    elsif tg_op='DELETE' then trip_ids:=array[old.id];
    else trip_ids:=array[old.id,new.id]; end if;
  else
    if tg_op='INSERT' then trip_ids:=array[new.vehicle_trip_id];
    elsif tg_op='DELETE' then trip_ids:=array[old.vehicle_trip_id];
    else trip_ids:=array[old.vehicle_trip_id,new.vehicle_trip_id]; end if;
  end if;
  foreach trip_id in array trip_ids loop
    select driver_employee_id into driver_id from vehicle_trips where id=trip_id;
    if not found then continue; end if;
    if (select count(*) from vehicle_trip_participants p where p.vehicle_trip_id=trip_id
        and p.role='DRIVER' and p.employee_id=driver_id) <> 1
      or exists(select 1 from vehicle_trip_participants p where p.vehicle_trip_id=trip_id
        and ((p.role='DRIVER' and p.employee_id<>driver_id)
          or (p.role='PASSENGER' and p.employee_id=driver_id))) then
      raise exception using errcode='ZV001',message='A shared trip must have exactly its recorded driver; the driver cannot be a passenger';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger shared_trip_driver_integrity after insert or update or delete on vehicle_trips
  deferrable initially deferred for each row execute function check_shared_trip_driver_integrity();
create constraint trigger shared_trip_participants_integrity after insert or update or delete on vehicle_trip_participants
  deferrable initially deferred for each row execute function check_shared_trip_driver_integrity();
