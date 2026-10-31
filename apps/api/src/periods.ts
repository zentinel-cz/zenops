import { monthlyPeriodActionSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";
import { getPeriodOverview } from "./period-overview.js";

const paramsSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

export function registerPeriodRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/periods/:month", { preHandler: requirePermission("period.manage") }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Neplatný měsíc." });
    return { period: await getPeriodOverview(db, params.data.month) };
  });

  app.post("/api/periods/:month/action", {
    preHandler: [requireTrustedOrigin, requirePermission("period.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = monthlyPeriodActionSchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "Neplatná změna měsíce." });
    const result = await db.begin(async (transaction) => {
      const [period] = await transaction<Array<{ id: string; state: string }>>`
        insert into monthly_periods (month_start) values (${`${params.data.month}-01`})
        on conflict (month_start) do update set month_start = excluded.month_start
        returning id, state
      `;
      await transaction`select id from monthly_periods where id = ${period!.id} for update`;
      if (body.data.action === "CLOSE") {
        if (period!.state !== "OPEN") return null;
        const [unresolved] = await transaction<Array<{ count: number }>>`
          select count(*)::int as count from work_days
          where monthly_period_id = ${period!.id} and state not in ('APPROVED','CANCELLED')
        `;
        if (unresolved!.count > 0) return { blocked: true, unresolved: unresolved!.count };
        const [updated] = await transaction`
          update monthly_periods set state = 'CLOSED', closed_at = now(), closed_by_user_id = ${request.sessionUser!.id}
          where id = ${period!.id} returning id, month_start, state, closed_at
        `;
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'MONTHLY_PERIOD_CLOSED', 'MONTHLY_PERIOD', ${period!.id}, ${transaction.json(updated!)})`;
        return { period: updated };
      }
      if (period!.state !== "CLOSED") return null;
      const [updated] = await transaction`
        update monthly_periods set state = 'OPEN', closed_at = null, closed_by_user_id = null,
          reopened_at = now(), reopened_by_user_id = ${request.sessionUser!.id}, reopen_reason = ${body.data.reason}
        where id = ${period!.id} returning id, month_start, state, reopened_at, reopen_reason
      `;
      await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data, reason)
        values (${request.sessionUser!.id}, 'MONTHLY_PERIOD_REOPENED', 'MONTHLY_PERIOD', ${period!.id},
          ${transaction.json(updated!)}, ${body.data.reason})`;
      return { period: updated };
    });
    if (result && "blocked" in result) return reply.code(409).send({ error: `Měsíc nelze uzavřít: ${result.unresolved} pracovních dnů není schváleno.`, unresolvedWorkDays: result.unresolved });
    if (!result) return reply.code(409).send({ error: "Měsíc již je v požadovaném stavu." });
    return result;
  });
}
