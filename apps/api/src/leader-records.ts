import { adminWorkEntryUpdateSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuthentication, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

const leaderOnly: AuthorizationHook = async (request, reply) => {
  await requireAuthentication(request, reply);
  if (!reply.sent && !request.sessionUser!.roles.includes("LEADER")) await reply.code(403).send({ error: "K této operaci nemáte oprávnění." });
};

export function registerLeaderRecordRoutes(app: FastifyInstance, db: Database, origin: AuthorizationHook) {
  app.get("/api/leader/workdays", { preHandler: leaderOnly }, async (request, reply) => {
    const query = z.object({ date: z.iso.date() }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Neplatné datum." });
    const rows = await db`select wd.id, wd.work_date, wd.shift_type, e.id as employee_id, e.display_name,
      json_agg(json_build_object('id',we.id,'projectId',p.id,'projectCode',p.code,'projectName',p.name,
        'workTypeCode',wt.code,'workTypeName',wt.name,'workActivityCode',wa.code,'startAt',we.start_at,
        'endAt',we.end_at,'description',we.description,'state',we.state,'machineUsages',work_entry_machine_usages(we.id)) order by we.start_at) as entries
      from work_entries we join work_days wd on wd.id=we.work_day_id join employees e on e.id=wd.employee_id
      join projects p on p.id=we.project_id join work_types wt on wt.id=we.work_type_id
      left join work_activities wa on wa.id=we.work_activity_id
      where wd.work_date=${query.data.date} and p.current_leader_employee_id=${request.sessionUser!.employeeId}
        and we.state='APPROVED'
      group by wd.id,e.id order by e.display_name`;
    // Do not expose the status, breaks or trips of the worker's other projects.
    return { workDays: rows.map((row) => ({ ...row, state: "APPROVED", breaks: [], vehicleTrips: [] })) };
  });

  app.patch("/api/leader/work-entries/:entryId", { preHandler: [origin, leaderOnly] }, async (request, reply) => {
    const params = z.object({ entryId: z.string().uuid() }).safeParse(request.params);
    const parsed = adminWorkEntryUpdateSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ error: "Neplatná oprava pracovního úseku." });
    if (parsed.data.workTypeCode === "OTHER" && !parsed.data.description?.trim()) return reply.code(422).send({ error: "U ostatní práce je povinný popis." });
    try {
      const result = await db.begin(async (t) => {
        // Serialize permission checks against a project handover.
        const [project] = await t`select p.id from projects p join work_entries we on we.project_id=p.id
          where we.id=${params.data.entryId} and p.current_leader_employee_id=${request.sessionUser!.employeeId} for share of p`;
        if (!project || project.id !== parsed.data.projectId) return null;
        await t`select wd.id from work_days wd join work_entries we on we.work_day_id=wd.id where we.id=${params.data.entryId} for update of wd`;
        const [before] = await t`select we.* from work_entries we join work_days wd on wd.id=we.work_day_id
          join monthly_periods mp on mp.id=wd.monthly_period_id where we.id=${params.data.entryId}
          and we.project_id=${project.id} and we.state='APPROVED' and mp.state='OPEN' for update of we`;
        if (!before) return null;
        const [kind] = await t`select wt.id,wa.id as activity_id from work_types wt
          left join work_activities wa on wa.work_type_id=wt.id and wa.code=${parsed.data.workActivityCode ?? null} and wa.is_active
          where wt.code=${parsed.data.workTypeCode} and wt.is_active and (not wt.requires_activity or wa.id is not null)`;
        if (!kind) return null;
        const [after] = await t`update work_entries set work_type_id=${kind.id},work_activity_id=${kind.activityId},
          start_at=${parsed.data.startAt},end_at=${parsed.data.endAt},description=${parsed.data.description ?? null},updated_at=now()
          where id=${before.id} returning *`;
        await t`insert into audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,reason)
          values(${request.sessionUser!.id},'WORK_ENTRY_LEADER_CORRECTED','WORK_ENTRY',${before.id},${t.json(before)},${t.json(after!)},${parsed.data.reason})`;
        return after;
      });
      if (!result) return reply.code(409).send({ error: "Opravit lze pouze schválenou práci na vlastní zakázce v otevřeném měsíci." });
      return { entry: result };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23P01") return reply.code(409).send({ error: "Opravený čas koliduje s prací, přestávkou nebo technikou." });
      throw error;
    }
  });
}
