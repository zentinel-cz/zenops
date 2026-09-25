import { createProjectSchema, projectStateSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  besip: boolean;
  startDate: string;
  endDate: string | null;
  status: "OPEN" | "CLOSED";
  leaderEmployeeId: string;
  leaderName: string;
};

export function registerProjectRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/projects", { preHandler: requirePermission("project.close") }, async () => {
    const projects = await db<ProjectRow[]>`
      select p.id, p.code, p.name, p.location, p.besip, p.start_date, p.end_date, p.status,
        p.current_leader_employee_id as leader_employee_id, e.display_name as leader_name
      from projects p join employees e on e.id = p.current_leader_employee_id
      order by (p.status = 'OPEN') desc, p.start_date desc, p.code
    `;
    return { projects };
  });

  app.get("/api/projects/open", { preHandler: requirePermission("project.read_open") }, async () => {
    const projects = await db<ProjectRow[]>`
      select p.id, p.code, p.name, p.location, p.besip, p.start_date, p.end_date, p.status,
        p.current_leader_employee_id as leader_employee_id, e.display_name as leader_name
      from projects p
      join employees e on e.id = p.current_leader_employee_id
      where p.status = 'OPEN'
      order by p.start_date desc, p.code
    `;
    return { projects };
  });

  app.post("/api/projects", {
    preHandler: [requireTrustedOrigin, requirePermission("project.create")],
  }, async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje zakázky.", details: parsed.error.flatten() });
    const actor = request.sessionUser!;
    const leader = await db<Array<{ id: string }>>`
      select e.id from employees e
      join users u on u.employee_id = e.id and u.is_active
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id and r.code = 'LEADER'
      where e.id = ${parsed.data.leaderEmployeeId} and e.is_active
      limit 1
    `;
    if (!leader[0]) return reply.code(422).send({ error: "Vedoucí zakázky musí být aktivní uživatel s rolí Vedoucí." });

    try {
      const project = await db.begin(async (transaction) => {
        const [created] = await transaction<Array<ProjectRow>>`
          insert into projects (
            code, name, location, besip, current_leader_employee_id, start_date, end_date, note, created_by_user_id
          ) values (
            ${parsed.data.code}, ${parsed.data.name}, ${parsed.data.location}, ${parsed.data.besip},
            ${parsed.data.leaderEmployeeId}, ${parsed.data.startDate}, ${parsed.data.endDate ?? null},
            ${parsed.data.note ?? null}, ${actor.id}
          )
          returning id, code, name, location, besip, start_date, end_date, status,
            current_leader_employee_id as leader_employee_id
        `;
        await transaction`
          insert into project_leader_history (project_id, leader_employee_id, changed_by_user_id)
          values (${created!.id}, ${parsed.data.leaderEmployeeId}, ${actor.id})
        `;
        await transaction`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${actor.id}, 'PROJECT_CREATED', 'PROJECT', ${created!.id}, ${transaction.json(created!)})
        `;
        return created!;
      });
      return reply.code(201).send({ project });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        return reply.code(409).send({ error: "Zakázka s tímto kódem již existuje." });
      }
      throw error;
    }
  });

  app.patch("/api/projects/:projectId/state", {
    preHandler: [requireTrustedOrigin, requirePermission("project.close")],
  }, async (request, reply) => {
    const parsed = projectStateSchema.safeParse(request.body);
    const projectId = (request.params as { projectId?: string }).projectId;
    if (!parsed.success || !projectId) return reply.code(400).send({ error: "Neplatná změna stavu zakázky." });
    const changed = await db.begin(async (transaction) => {
      const existing = await transaction<Array<ProjectRow>>`
        select p.id, p.code, p.name, p.location, p.besip, p.start_date, p.end_date, p.status,
          p.current_leader_employee_id as leader_employee_id, e.display_name as leader_name
        from projects p join employees e on e.id = p.current_leader_employee_id
        where p.id = ${projectId} for update of p
      `;
      if (!existing[0] || existing[0].status === parsed.data.status) return null;
      const [updated] = parsed.data.status === "CLOSED"
        ? await transaction<Array<ProjectRow>>`
            update projects set status = 'CLOSED', closed_at = now(), closed_by_user_id = ${request.sessionUser!.id}, updated_at = now()
            where id = ${projectId} returning id, code, name, location, besip, start_date, end_date, status,
              current_leader_employee_id as leader_employee_id
          `
        : await transaction<Array<ProjectRow>>`
            update projects set status = 'OPEN', closed_at = null, closed_by_user_id = null, updated_at = now()
            where id = ${projectId} returning id, code, name, location, besip, start_date, end_date, status,
              current_leader_employee_id as leader_employee_id
          `;
      await transaction`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
        values (${request.sessionUser!.id}, ${parsed.data.status === 'CLOSED' ? 'PROJECT_CLOSED' : 'PROJECT_REOPENED'},
          'PROJECT', ${projectId}, ${transaction.json(existing[0])}, ${transaction.json(updated!)}, ${parsed.data.reason ?? null})
      `;
      return updated!;
    });
    if (!changed) return reply.code(404).send({ error: "Zakázka nebyla nalezena nebo je již v požadovaném stavu." });
    return { project: changed };
  });
}
