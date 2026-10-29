with intervals as (
  select wd.employee_id, wd.id as work_day_id, we.id, 'WORK' as kind, we.start_at, we.end_at
  from work_entries we join work_days wd on wd.id=we.work_day_id
  union all
  select wd.employee_id, wd.id, be.id, 'BREAK', be.start_at, be.end_at
  from break_entries be join work_days wd on wd.id=be.work_day_id
)
select current.employee_id, current.work_day_id, current.id, current.kind,
  other.work_day_id as conflicting_work_day_id, other.id as conflicting_id, other.kind as conflicting_kind,
  current.start_at, current.end_at, other.start_at as conflicting_start_at, other.end_at as conflicting_end_at
from intervals current join intervals other on current.employee_id=other.employee_id and current.id<other.id
where tstzrange(current.start_at,current.end_at,'[)') && tstzrange(other.start_at,other.end_at,'[)');

with intervals as (
  select work_day_id, id, 'WORK' as kind, start_at, end_at from work_entries
  union all select work_day_id, id, 'BREAK', start_at, end_at from break_entries
  union all select driver_work_day_id, id, 'TRIP', start_at, end_at from vehicle_trips
)
select wd.id as work_day_id, wd.work_date, intervals.id, intervals.kind, intervals.start_at, intervals.end_at
from intervals join work_days wd on wd.id=intervals.work_day_id
where intervals.start_at < (wd.work_date::timestamp at time zone 'Europe/Prague')
   or intervals.end_at > ((wd.work_date+2)::timestamp at time zone 'Europe/Prague');

with intervals as (
  select work_day_id, start_at from work_entries
  union all select work_day_id, start_at from break_entries
  union all select driver_work_day_id, start_at from vehicle_trips
)
select wd.id as work_day_id, wd.work_date, min(intervals.start_at) as first_start
from work_days wd left join intervals on intervals.work_day_id=wd.id
where wd.state not in ('DRAFT','RETURNED','CANCELLED')
group by wd.id
having min(intervals.start_at) is null or (min(intervals.start_at) at time zone 'Europe/Prague')::date<>wd.work_date;
