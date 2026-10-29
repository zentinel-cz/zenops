import type { ProjectDayInput, ProjectFuelInput, SessionUser } from "@zenops/contracts";
import type { Database } from "./db.js";

type FuelRow = {
  id: string;
  category: string;
  fuelConsumed: string | null;
  fuelRefuelled: string | null;
  recordedByEmployeeId: string;
  note: string | null;
  clearedAt: Date | null;
  clearedByUserId: string | null;
  updatedAt: Date;
};

export async function saveProjectDay(db: Database, actor: SessionUser, projectId: string, date: string,
  input: { day?: ProjectDayInput; fuel?: ProjectFuelInput }) {
  return db.begin(async (transaction) => {
    const [project] = await transaction`select id,status,current_leader_employee_id from projects where id=${projectId} for update`;
    if (!project) throw Object.assign(new Error("Zakázka nebyla nalezena."), { statusCode: 404 });
    if (!actor.roles.includes("ADMIN") && (!actor.roles.includes("LEADER") || project.currentLeaderEmployeeId !== actor.employeeId)) {
      throw Object.assign(new Error("K této operaci nemáte oprávnění."), { statusCode: 403 });
    }
    if (project.status !== "OPEN") throw Object.assign(new Error("K uzavřené zakázce nelze měnit denní údaje ani palivo."), { statusCode: 409 });
    const [beforeDay] = await transaction`select * from project_days where project_id=${projectId} and work_date=${date}`;
    const [projectDay] = input.day ? await transaction`
      insert into project_days(project_id,work_date,weather,temperature_c,note,updated_by_user_id)
      values(${projectId},${date},${input.day.weather ?? null},${input.day.temperatureC ?? null},${input.day.note ?? null},${actor.id})
      on conflict(project_id,work_date) do update set weather=excluded.weather,temperature_c=excluded.temperature_c,
        note=excluded.note,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()
      returning *
    ` : await transaction`
      insert into project_days(project_id,work_date) values(${projectId},${date})
      on conflict(project_id,work_date) do update set project_id=excluded.project_id returning *
    `;
    if (input.day) {
      await transaction`insert into audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data)
        values(${actor.id},'PROJECT_DAY_SAVED','PROJECT_DAY',${projectDay!.id},
          ${beforeDay ? transaction.json(beforeDay) : null},${transaction.json(projectDay!)})`;
    }
    const [beforeFuel] = await transaction<FuelRow[]>`
      select id,category,fuel_consumed,fuel_refuelled,recorded_by_employee_id,note,cleared_at,cleared_by_user_id,updated_at
      from project_fuel_records where project_day_id=${projectDay!.id} and category='BRUSHCUTTER'
    `;
    let fuelRecord = beforeFuel ?? null;
    if (input.fuel) {
      const consumed = input.fuel.fuelConsumed ?? null;
      const refuelled = input.fuel.fuelRefuelled ?? null;
      const note = input.fuel.note || null;
      const clearing = consumed === null && refuelled === null;
      if (clearing && !beforeFuel && note) {
        throw Object.assign(new Error("Samotnou poznámku k palivu nelze uložit bez spotřeby nebo tankování."), { statusCode: 422 });
      }
      const unchanged = beforeFuel
        && (beforeFuel.fuelConsumed == null ? null : Number(beforeFuel.fuelConsumed)) === consumed
        && (beforeFuel.fuelRefuelled == null ? null : Number(beforeFuel.fuelRefuelled)) === refuelled
        && beforeFuel.note === note;
      if (!unchanged && (!clearing || beforeFuel)) {
        const [saved] = await transaction<FuelRow[]>`
          insert into project_fuel_records(project_day_id,category,fuel_consumed,fuel_refuelled,recorded_by_employee_id,note,cleared_at,cleared_by_user_id)
          values(${projectDay!.id},${input.fuel.category},${consumed},${refuelled},${actor.employeeId},${note},
            ${clearing ? new Date() : null},${clearing ? actor.id : null})
          on conflict(project_day_id,category) do update set fuel_consumed=excluded.fuel_consumed,
            fuel_refuelled=excluded.fuel_refuelled,recorded_by_employee_id=excluded.recorded_by_employee_id,
            note=excluded.note,cleared_at=excluded.cleared_at,cleared_by_user_id=excluded.cleared_by_user_id,updated_at=now()
          returning id,category,fuel_consumed,fuel_refuelled,recorded_by_employee_id,note,cleared_at,cleared_by_user_id,updated_at
        `;
        fuelRecord = saved!;
        await transaction`insert into audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data)
          values(${actor.id},${clearing ? 'PROJECT_FUEL_CLEARED' : 'PROJECT_FUEL_SAVED'},'PROJECT_FUEL_RECORD',${saved!.id},
            ${beforeFuel ? transaction.json(beforeFuel) : null},${transaction.json(saved!)})`;
      }
    }
    return { projectDay: projectDay!, fuelRecord };
  });
}
