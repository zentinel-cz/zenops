import type { Database } from "./db.js";

/** Counts and their explanatory records share one committed SQL snapshot. */
export async function getPeriodOverview(db: Database, month: string) {
  const [period] = await db`
    select mp.id,requested.month_start,coalesce(mp.state,'OPEN') as state,mp.closed_at,mp.reopened_at,mp.reopen_reason,
      summary.total_work_days,summary.unresolved_work_days,summary.cancelled_work_days,summary.blockers
    from (values(${month+'-01'}::date)) requested(month_start)
    left join monthly_periods mp on mp.month_start=requested.month_start
    cross join lateral (
      select count(*) filter(where wd.state<>'CANCELLED')::int as total_work_days,
        count(*) filter(where wd.state not in ('APPROVED','CANCELLED'))::int as unresolved_work_days,
        count(*) filter(where wd.state='CANCELLED')::int as cancelled_work_days,
        coalesce(jsonb_agg(jsonb_build_object(
          'id',wd.id,'workDate',wd.work_date,'shiftType',wd.shift_type,'state',wd.state,
          'employeeId',e.id,'employeeName',e.display_name,
          'workerCanAct',exists(select 1 from users u join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id
            where u.employee_id=e.id and u.is_active and e.is_active and r.code='WORKER'),
          'workEntryCount',(select count(*) from work_entries we where we.work_day_id=wd.id),
          'canCancel',wd.state='DRAFT' and wd.submitted_at is null and mp.state='OPEN' and workday_is_empty(wd.id),
          'entries',coalesce((select jsonb_agg(jsonb_build_object(
            'id',we.id,'state',we.state,'startAt',we.start_at,'endAt',we.end_at,
            'projectId',p.id,'projectCode',p.code,'projectName',p.name,'workTypeName',wt.name,
            'leaderEmployeeId',leader.id,'leaderName',leader.display_name,
            'leaderCanApprove',exists(select 1 from users lu join user_roles lur on lur.user_id=lu.id join roles lr on lr.id=lur.role_id
              where lu.employee_id=leader.id and lu.is_active and leader.is_active and lr.code='LEADER'),
            'returnReason',case when we.state='RETURNED' then (
              select a.reason from approvals a where a.work_entry_id=we.id and a.action='RETURNED'
              order by a.created_at desc,a.id desc limit 1) else null end
          ) order by we.start_at,we.id)
            from work_entries we join projects p on p.id=we.project_id
            join employees leader on leader.id=p.current_leader_employee_id join work_types wt on wt.id=we.work_type_id
            where we.work_day_id=wd.id and we.state<>'APPROVED'),'[]'::jsonb)
        ) order by wd.work_date,e.display_name,wd.id) filter(where wd.state not in ('APPROVED','CANCELLED')),'[]'::jsonb) as blockers
      from work_days wd join employees e on e.id=wd.employee_id where wd.monthly_period_id=mp.id
    ) summary
  `;
  return period!;
}
