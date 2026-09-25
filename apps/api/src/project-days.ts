import { projectDaySchema } from "@zenops/contracts";
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
    if (!params.success || !query.success) return reply.code(400).send({ error: "Neplatný projekt nebo datum." });
    const rows = await db`
      select pd.id, pd.project_id, pd.work_date, pd.weather, pd.temperature_c, pd.note,
        pd.updated_at, e.display_name as updated_by_name
      from project_days pd
      left join users u on u.id = pd.updated_by_user_id
      left join employees e on e.id = u.employee_id
      where pd.project_id = ${params.data.projectId} and pd.work_date = ${query.data.date}
    `;
    return { projectDay: rows[0] ?? null };
  });

  app.put("/api/projects/:projectId/day", {
    preHandler: [requireTrustedOrigin, requirePermission("project_day.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    const body = projectDaySchema.safeParse(request.body);
    if (!params.success || !query.success || !body.success) return reply.code(400).send({ error: "Neplatné denní údaje projektu." });
    const project = await db<Array<{ leaderEmployeeId: string }>>`
      select current_leader_employee_id as leader_employee_id from projects where id = ${params.data.projectId}
    `;
    if (!project[0]) return reply.code(404).send({ error: "Projekt nebyl nalezen." });
    const isAdmin = request.sessionUser!.roles.includes("ADMIN");
    if (!isAdmin && project[0].leaderEmployeeId !== request.sessionUser!.employeeId) {
      return reply.code(403).send({ error: "Denní údaje může měnit pouze aktuální Vedoucí projektu nebo Admin." });
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
}
