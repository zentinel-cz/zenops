import { approvalDecisionSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuthentication, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

type PendingEntry = {
  id: string; workDayId: string; employeeId: string; employeeName: string; workDate: string;
  startAt: Date; endAt: Date; projectId: string; projectCode: string; projectName: string;
  workTypeName: string; projectLeaderEmployeeId: string;
};

function canAct(roles: string[], employeeId: string, entry: PendingEntry): boolean {
  const ownLeaderWork = entry.employeeId === entry.projectLeaderEmployeeId;
  if (roles.includes("ADMIN") && ownLeaderWork) return true;
  return roles.includes("LEADER") && !ownLeaderWork && employeeId === entry.projectLeaderEmployeeId;
}

export function registerApprovalRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/approvals/pending", { preHandler: requireAuthentication }, async (request, reply) => {
    if (!request.sessionUser!.permissions.some((permission) => permission === "approval.project.manage" || permission === "approval.admin.manage")) {
      return reply.code(403).send({ error: "K této operaci nemáte oprávnění." });
    }
    const entries = await db<PendingEntry[]>`
      select we.id, wd.id as work_day_id, owner.id as employee_id, owner.display_name as employee_name,
        wd.work_date, we.start_at, we.end_at, p.id as project_id, p.code as project_code, p.name as project_name,
        wt.name as work_type_name, p.current_leader_employee_id as project_leader_employee_id
      from work_entries we join work_days wd on wd.id = we.work_day_id
      join employees owner on owner.id = wd.employee_id
      join projects p on p.id = we.project_id join work_types wt on wt.id = we.work_type_id
      where we.state = 'SUBMITTED' order by wd.work_date, p.code, we.start_at
    `;
    return { entries: entries.filter((entry) => canAct(request.sessionUser!.roles, request.sessionUser!.employeeId, entry)) };
  });

  app.post("/api/approvals/:entryId/decision", {
    preHandler: [requireTrustedOrigin, requireAuthentication],
  }, async (request, reply) => {
    const params = z.object({ entryId: z.string().uuid() }).safeParse(request.params);
    const decision = approvalDecisionSchema.safeParse(request.body);
    if (!params.success || !decision.success) return reply.code(400).send({ error: "Neplatné rozhodnutí." });
    const result = await db.begin(async (transaction) => {
      const rows = await transaction<PendingEntry[]>`
        select we.id, wd.id as work_day_id, owner.id as employee_id, owner.display_name as employee_name,
          wd.work_date, we.start_at, we.end_at, p.id as project_id, p.code as project_code, p.name as project_name,
          wt.name as work_type_name, p.current_leader_employee_id as project_leader_employee_id
        from work_entries we join work_days wd on wd.id = we.work_day_id
        join employees owner on owner.id = wd.employee_id join projects p on p.id = we.project_id
        join work_types wt on wt.id = we.work_type_id
        where we.id = ${params.data.entryId} and we.state = 'SUBMITTED' for update of we
      `;
      const entry = rows[0];
      if (!entry || !canAct(request.sessionUser!.roles, request.sessionUser!.employeeId, entry)) return null;
      await transaction`
        insert into approvals (work_entry_id, action, approver_employee_id, reason)
        values (${entry.id}, ${decision.data.action}, ${request.sessionUser!.employeeId},
          ${decision.data.action === 'RETURNED' ? decision.data.reason : null})
      `;
      await transaction`update work_entries set state = ${decision.data.action}, updated_at = now() where id = ${entry.id}`;
      const states = await transaction<Array<{ state: string }>>`select state from work_entries where work_day_id = ${entry.workDayId}`;
      const aggregate = states.some((item) => item.state === "RETURNED") ? "RETURNED"
        : states.every((item) => item.state === "APPROVED") ? "APPROVED"
        : states.some((item) => item.state === "APPROVED") ? "PARTIALLY_APPROVED" : "SUBMITTED";
      await transaction`update work_days set state = ${aggregate}, updated_at = now() where id = ${entry.workDayId}`;
      const reason = decision.data.action === "RETURNED" ? decision.data.reason : null;
      await transaction`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
        values (${request.sessionUser!.id}, ${`WORK_ENTRY_${decision.data.action}`}, 'WORK_ENTRY', ${entry.id},
          ${transaction.json({ state: decision.data.action, workDayState: aggregate, reason })})
      `;
      return { entryId: entry.id, state: decision.data.action, workDayState: aggregate };
    });
    if (!result) return reply.code(403).send({ error: "Tuto práci nemůžete schválit nebo již není čekající." });
    return { decision: result };
  });
}
