import type { ProjectActivityEntry } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuthentication } from "./authorization.js";
import type { Database } from "./db.js";
import { summarizeMachines } from "./machine-summary.js";

export function registerProjectActivityRoutes(app: FastifyInstance, db: Database) {
  app.get("/api/projects/:projectId/activity", { preHandler: requireAuthentication }, async (request, reply) => {
    const user = request.sessionUser!;
    if (!user.roles.some(role => role === "ADMIN" || role === "LEADER"))
      return reply.code(403).send({ error: "Přehled zakázky je dostupný Vedoucímu a Adminovi." });
    const params = z.object({ projectId: z.string().uuid() }).safeParse(request.params);
    const query = z.object({ date: z.iso.date() }).safeParse(request.query);
    if (!params.success || !query.success) return reply.code(400).send({ error: "Neplatná zakázka nebo datum." });
    // Project authorization and all scoped entries use one statement/snapshot.
    // In particular, don't expose another project's WorkDay state, breaks or trips.
    const [project] = await db`select p.id,p.code,p.name,p.location,p.status,p.note,
      e.display_name as leader_name,
      coalesce((select jsonb_agg(jsonb_build_object(
        'id',we.id,'employeeId',worker.id,'employeeName',worker.display_name,
        'shiftType',wd.shift_type,'entryState',we.state,'startAt',we.start_at,'endAt',we.end_at,
        'workTypeName',wt.name,'workActivityName',wa.name,'description',we.description,
        'projectCode',p.code,'projectName',p.name,
        'workedMinutes',round(extract(epoch from (we.end_at-we.start_at))/60)::int,
        'machineUsages',work_entry_machine_usages(we.id)
      ) order by worker.display_name,worker.id,we.start_at,we.id)
      from work_entries we join work_days wd on wd.id=we.work_day_id
      join employees worker on worker.id=wd.employee_id join work_types wt on wt.id=we.work_type_id
      left join work_activities wa on wa.id=we.work_activity_id
      where we.project_id=p.id and wd.work_date=${query.data.date}),'[]'::jsonb) as entries
      from projects p join employees e on e.id=p.current_leader_employee_id
      where p.id=${params.data.projectId}
        and (${user.roles.includes("ADMIN")} or p.current_leader_employee_id=${user.employeeId})`;
    if (!project) return reply.code(404).send({ error: "Zakázka nebyla nalezena nebo ji nevedete." });
    const entries = project.entries as ProjectActivityEntry[];
    return reply.header("cache-control", "no-store").send({ activity: { date: query.data.date, project,
      summary: { workers: new Set(entries.map(entry => entry.employeeId)).size, entries: entries.length,
        workedMinutes: entries.reduce((sum, entry) => sum + entry.workedMinutes, 0),
        approvedMinutes: entries.filter(entry => entry.entryState === "APPROVED").reduce((sum, entry) => sum + entry.workedMinutes, 0) },
      machines: summarizeMachines(entries) } });
  });
}
