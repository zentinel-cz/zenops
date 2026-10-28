import type { TransactionSql } from "postgres";

/** Serialize worker writes with submission and approval before reading child records. */
export async function lockEditableWorkDay(transaction: TransactionSql, workDayId: string, employeeId: string) {
  const [day] = await transaction<Array<{ id: string; workDate: string }>>`
    select wd.id, wd.work_date::text as work_date from work_days wd
    join monthly_periods mp on mp.id = wd.monthly_period_id
    where wd.id = ${workDayId} and wd.employee_id = ${employeeId}
      and wd.state in ('DRAFT', 'RETURNED') and mp.state = 'OPEN'
    for update of wd
  `;
  if (!day) throw Object.assign(new Error("Pracovní den nelze upravit v aktuálním stavu."), { statusCode: 409 });
  return day;
}
