import { projectDaySchema, projectFuelSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

const paramsSchema = z.object({ projectId: z.string().uuid() });
const querySchema = z.object({ date: z.iso.date() });

export function registerProjectDayRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/projects/:projectId/day", { preHandler: requirePermission("project.read_open") }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Neplatná zakázka nebo datum." });
    const rows = await db`
      select pd.id, pd.project_id, pd.work_date, pd.weather, pd.temperature_c, pd.note,
        pd.updated_at, e.display_name as updated_by_name
      from project_days pd
      left join users u on u.id = pd.updated_by_user_id
      left join employees e on e.id = u.employee_id
      where pd.project_id = ${params.data.projectId} and pd.work_date = ${query.data.date}
    `;
    const fuelRecords = rows[0] ? await db`
      select pfr.id, pfr.category, pfr.fuel_consumed, pfr.fuel_refuelled, pfr.note,
        pfr.recorded_by_employee_id, e.display_name as recorded_by_name, pfr.updated_at
      from project_fuel_records pfr join employees e on e.id = pfr.recorded_by_employee_id
      where pfr.project_day_id = ${rows[0].id} order by pfr.category
    ` : [];
    return { projectDay: rows[0] ?? null, fuelRecords };
  });

  app.put("/api/projects/:projectId/day", {
    preHandler: [requireTrustedOrigin, requirePermission("project_day.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    const body = projectDaySchema.safeParse(request.body);
    if (!params.success || !query.success || !body.success) return reply.code(400).send({ error: "Neplatné denní údaje zakázky." });
    const [closedPeriod] = await db<Array<{ closed: boolean }>>`
      select exists(select 1 from monthly_periods where month_start = date_trunc('month', ${query.data.date}::date)::date and state = 'CLOSED') as closed
    `;
    if (closedPeriod!.closed) return reply.code(409).send({ error: "Uzavřený měsíc nelze běžně měnit." });
    const project = await db<Array<{ leaderEmployeeId: string }>>`
      select current_leader_employee_id as leader_employee_id from projects where id = ${params.data.projectId}
    `;
    if (!project[0]) return reply.code(404).send({ error: "Zakázka nebyla nalezena." });
    const isAdmin = request.sessionUser!.roles.includes("ADMIN");
    if (!isAdmin && project[0].leaderEmployeeId !== request.sessionUser!.employeeId) {
      return reply.code(403).send({ error: "Denní údaje může měnit pouze aktuální Vedoucí zakázky nebo Admin." });
    }
    const projectDay = await db.begin(async (transaction) => {
      const before = await transaction`
        select id, project_id, work_date, weather, temperature_c, note from project_days
        where project_id = ${params.data.projectId} and work_date = ${query.data.date}
      `;
      const [saved] = await transaction`
        insert into project_days (project_id, work_date, weather, temperature_c, note, updated_by_user_id)
        values (${params.data.projectId}, ${query.data.date}, ${body.data.weather ?? null},
          ${body.data.temperatureC ?? null}, ${body.data.note ?? null}, ${request.sessionUser!.id})
        on conflict (project_id, work_date) do update set
          weather = excluded.weather, temperature_c = excluded.temperature_c, note = excluded.note,
          updated_by_user_id = excluded.updated_by_user_id, updated_at = now()
        returning id, project_id, work_date, weather, temperature_c, note, updated_at
      `;
      await transaction`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
        values (${request.sessionUser!.id}, 'PROJECT_DAY_SAVED', 'PROJECT_DAY', ${saved!.id},
          ${before[0] ? transaction.json(before[0]) : null}, ${transaction.json(saved!)})
      `;
      return saved!;
    });
    return { projectDay };
  });

  app.put("/api/projects/:projectId/day/fuel", {
    preHandler: [requireTrustedOrigin, requirePermission("fuel.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    const body = projectFuelSchema.safeParse(request.body);
    if (!params.success || !query.success || !body.success) return reply.code(400).send({ error: "Neplatný záznam paliva." });
    const [closedPeriod] = await db<Array<{ closed: boolean }>>`
      select exists(select 1 from monthly_periods where month_start = date_trunc('month', ${query.data.date}::date)::date and state = 'CLOSED') as closed
    `;
    if (closedPeriod!.closed) return reply.code(409).send({ error: "Uzavřený měsíc nelze běžně měnit." });
    const projects = await db<Array<{ leaderEmployeeId: string; status: string }>>`
      select current_leader_employee_id as leader_employee_id, status from projects where id = ${params.data.projectId}
    `;
    if (!projects[0]) return reply.code(404).send({ error: "Zakázka nebyla nalezena." });
    const isAdmin = request.sessionUser!.roles.includes("ADMIN");
    if (!isAdmin && projects[0].leaderEmployeeId !== request.sessionUser!.employeeId) {
      return reply.code(403).send({ error: "Palivo může spravovat pouze aktuální Vedoucí zakázky nebo Admin." });
    }
    if (projects[0].status !== "OPEN") return reply.code(409).send({ error: "K uzavřené zakázce nelze přidávat provozní údaje." });
    const fuelRecord = await db.begin(async (transaction) => {
      const [projectDay] = await transaction<Array<{ id: string }>>`
        insert into project_days (project_id, work_date) values (${params.data.projectId}, ${query.data.date})
        on conflict (project_id, work_date) do update set project_id = excluded.project_id returning id
      `;
      const before = await transaction`
        select id, category, fuel_consumed, fuel_refuelled, recorded_by_employee_id, note
        from project_fuel_records where project_day_id = ${projectDay!.id} and category = ${body.data.category}
      `;
      const [saved] = await transaction`
        insert into project_fuel_records (project_day_id, category, fuel_consumed, fuel_refuelled, recorded_by_employee_id, note)
        values (${projectDay!.id}, ${body.data.category}, ${body.data.fuelConsumed ?? null},
          ${body.data.fuelRefuelled ?? null}, ${request.sessionUser!.employeeId}, ${body.data.note ?? null})
        on conflict (project_day_id, category) do update set fuel_consumed = excluded.fuel_consumed,
          fuel_refuelled = excluded.fuel_refuelled, recorded_by_employee_id = excluded.recorded_by_employee_id,
          note = excluded.note, updated_at = now()
        returning id, category, fuel_consumed, fuel_refuelled, recorded_by_employee_id, note, updated_at
      `;
      await transaction`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
        values (${request.sessionUser!.id}, 'PROJECT_FUEL_SAVED', 'PROJECT_FUEL_RECORD', ${saved!.id},
          ${before[0] ? transaction.json(before[0]) : null}, ${transaction.json(saved!)})
      `;
      return saved!;
    });
    return { fuelRecord };
  });
}
