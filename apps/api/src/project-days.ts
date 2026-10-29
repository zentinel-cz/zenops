import { projectFuelSchema, saveProjectDaySchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";
import { saveProjectDay } from "./project-day-save.js";

const paramsSchema = z.object({ projectId: z.string().uuid() });
const querySchema = z.object({ date: z.iso.date() });

export function registerProjectDayRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/projects/:projectId/day", { preHandler: requirePermission("project_day.manage") }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Neplatná zakázka nebo datum." });
    // One SQL statement reads weather and fuel from the same committed snapshot.
    const [result] = await db`
      select (select json_build_object('id',pd.id,'projectId',pd.project_id,'workDate',pd.work_date,
        'weather',pd.weather,'temperatureC',pd.temperature_c::text,'note',pd.note,
        'updatedAt',pd.updated_at,'updatedByName',e.display_name)
        from project_days pd left join users u on u.id=pd.updated_by_user_id
        left join employees e on e.id=u.employee_id
        where pd.project_id=p.id and pd.work_date=${query.data.date}) as project_day,
        coalesce((select json_agg(json_build_object('id',f.id,'category',f.category,
          'fuelConsumed',f.fuel_consumed::text,'fuelRefuelled',f.fuel_refuelled::text,
          'note',f.note,'recordedByEmployeeId',f.recorded_by_employee_id,'recordedByName',e.display_name,
          'updatedAt',f.updated_at,'clearedAt',f.cleared_at,'clearedByUserId',f.cleared_by_user_id) order by f.category)
          from project_fuel_records f join project_days pd on pd.id=f.project_day_id
          join employees e on e.id=f.recorded_by_employee_id
          where pd.project_id=p.id and pd.work_date=${query.data.date}),'[]'::json) as fuel_records
      from projects p where p.id=${params.data.projectId}
        and (${request.sessionUser!.roles.includes("ADMIN")} or p.current_leader_employee_id=${request.sessionUser!.employeeId})
    `;
    if (!result) return reply.code(404).send({ error: "Zakázka nebyla nalezena." });
    return result;
  });

  app.put("/api/projects/:projectId/day", {
    preHandler: [requireTrustedOrigin, requirePermission("project_day.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    const body = saveProjectDaySchema.safeParse(request.body);
    if (!params.success || !query.success || !body.success) return reply.code(400).send({ error: "Neplatné denní údaje zakázky." });
    if (body.data.fuel && !request.sessionUser!.permissions.includes("fuel.manage")) {
      return reply.code(403).send({ error: "K této operaci nemáte oprávnění." });
    }
    const { fuel, ...day } = body.data;
    return saveProjectDay(db, request.sessionUser!, params.data.projectId, query.data.date, { day, ...(fuel ? { fuel } : {}) });
  });

  app.put("/api/projects/:projectId/day/fuel", {
    preHandler: [requireTrustedOrigin, requirePermission("fuel.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    const body = projectFuelSchema.safeParse(request.body);
    if (!params.success || !query.success || !body.success) return reply.code(400).send({ error: "Neplatný záznam paliva." });
    const { fuelRecord } = await saveProjectDay(db, request.sessionUser!, params.data.projectId, query.data.date, { fuel: body.data });
    return { fuelRecord };
  });
}
