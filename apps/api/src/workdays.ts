import { createBreakEntrySchema, createWorkDaySchema, createWorkEntrySchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

const idParams = z.object({ workDayId: z.string().uuid() });

async function getOwnedWorkDay(db: Database, workDayId: string, employeeId: string) {
  const rows = await db<Array<{ id: string; workDate: string; shiftType: string; state: string }>>`
    select id, work_date, shift_type, state from work_days
    where id = ${workDayId} and employee_id = ${employeeId} limit 1
  `;
  return rows[0] ?? null;
}

async function getWorkDayDetail(db: Database, workDayId: string, employeeId: string) {
  const workDay = await getOwnedWorkDay(db, workDayId, employeeId);
  if (!workDay) return null;
  const entries = await db`
    select we.id, we.start_at, we.end_at, we.description, we.state, p.id as project_id,
      p.code as project_code, p.name as project_name, wt.code as work_type_code,
      wt.name as work_type_name, wa.code as work_activity_code, wa.name as work_activity_name
    from work_entries we
    join projects p on p.id = we.project_id
    join work_types wt on wt.id = we.work_type_id
    left join work_activities wa on wa.id = we.work_activity_id
    where we.work_day_id = ${workDayId} order by we.start_at
  `;
  const breaks = await db`
    select id, start_at, end_at from break_entries where work_day_id = ${workDayId} order by start_at
  `;
  return { ...workDay, entries, breaks };
}

export function registerWorkDayRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  const own = requirePermission("workday.own.manage");

  app.get("/api/workdays/current", { preHandler: own }, async (request, reply) => {
    const query = z.object({ date: z.iso.date() }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Neplatné datum." });
    const rows = await db<Array<{ id: string }>>`
      select id from work_days where employee_id = ${request.sessionUser!.employeeId} and work_date = ${query.data.date}
    `;
    if (!rows[0]) return reply.code(404).send({ error: "Pracovní den neexistuje." });
    return { workDay: await getWorkDayDetail(db, rows[0].id, request.sessionUser!.employeeId) };
  });

  app.post("/api/workdays", { preHandler: [requireTrustedOrigin, own] }, async (request, reply) => {
    const parsed = createWorkDaySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje pracovního dne." });
    const monthStart = `${parsed.data.workDate.slice(0, 7)}-01`;
    try {
      const workDay = await db.begin(async (transaction) => {
        const periods = await transaction<Array<{ id: string; state: string }>>`
          insert into monthly_periods (month_start) values (${monthStart})
          on conflict (month_start) do update set month_start = excluded.month_start
          returning id, state
        `;
        if (periods[0]!.state !== "OPEN") throw Object.assign(new Error("Měsíc je uzavřen."), { statusCode: 409 });
        const [created] = await transaction`
          insert into work_days (employee_id, monthly_period_id, work_date, shift_type)
          values (${request.sessionUser!.employeeId}, ${periods[0]!.id}, ${parsed.data.workDate}, ${parsed.data.shiftType})
          returning id, work_date, shift_type, state
        `;
        return created;
      });
      return reply.code(201).send({ workDay: { ...workDay, entries: [], breaks: [] } });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        return reply.code(409).send({ error: "Pracovní den pro toto datum již existuje." });
      }
      throw error;
    }
  });

  app.post("/api/workdays/:workDayId/entries", { preHandler: [requireTrustedOrigin, own] }, async (request, reply) => {
    const params = idParams.safeParse(request.params);
    const parsed = createWorkEntrySchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ error: "Neplatný pracovní úsek." });
    const workDay = await getOwnedWorkDay(db, params.data.workDayId, request.sessionUser!.employeeId);
    if (!workDay) return reply.code(404).send({ error: "Pracovní den nebyl nalezen." });
    if (!['DRAFT', 'RETURNED'].includes(workDay.state)) return reply.code(409).send({ error: "Odeslaný pracovní den nelze běžně upravovat." });
    if (parsed.data.workTypeCode === "OTHER" && !parsed.data.description) return reply.code(422).send({ error: "U ostatní práce je povinný popis." });
    try {
      const [entry] = await db`
        insert into work_entries (work_day_id, project_id, work_type_id, work_activity_id, start_at, end_at, description)
        select ${workDay.id}, p.id, wt.id, wa.id, ${parsed.data.startAt}, ${parsed.data.endAt}, ${parsed.data.description ?? null}
        from projects p join work_types wt on wt.code = ${parsed.data.workTypeCode} and wt.is_active
        left join work_activities wa on wa.work_type_id = wt.id and wa.code = ${parsed.data.workActivityCode ?? null} and wa.is_active
        where p.id = ${parsed.data.projectId} and p.status = 'OPEN'
          and (not wt.requires_activity or wa.id is not null)
        returning id, start_at, end_at, description, state
      `;
      if (!entry) return reply.code(422).send({ error: "Projekt, druh práce nebo povinná aktivita nejsou platné." });
      return reply.code(201).send({ entry });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23P01") {
        return reply.code(409).send({ error: "Pracovní úsek se překrývá s jinou prací nebo přestávkou." });
      }
      throw error;
    }
  });

  app.post("/api/workdays/:workDayId/breaks", { preHandler: [requireTrustedOrigin, own] }, async (request, reply) => {
    const params = idParams.safeParse(request.params);
    const parsed = createBreakEntrySchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ error: "Neplatná přestávka." });
    const workDay = await getOwnedWorkDay(db, params.data.workDayId, request.sessionUser!.employeeId);
    if (!workDay) return reply.code(404).send({ error: "Pracovní den nebyl nalezen." });
    if (!['DRAFT', 'RETURNED'].includes(workDay.state)) return reply.code(409).send({ error: "Odeslaný pracovní den nelze běžně upravovat." });
    try {
      const [entry] = await db`
        insert into break_entries (work_day_id, start_at, end_at)
        values (${workDay.id}, ${parsed.data.startAt}, ${parsed.data.endAt}) returning id, start_at, end_at
      `;
      return reply.code(201).send({ break: entry });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23P01") {
        return reply.code(409).send({ error: "Přestávka se překrývá s prací nebo jinou přestávkou." });
      }
      throw error;
    }
  });

  app.post("/api/workdays/:workDayId/submit", { preHandler: [requireTrustedOrigin, requirePermission("workday.own.submit")] }, async (request, reply) => {
    const params = idParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Neplatný pracovní den." });
    const workDay = await getOwnedWorkDay(db, params.data.workDayId, request.sessionUser!.employeeId);
    if (!workDay) return reply.code(404).send({ error: "Pracovní den nebyl nalezen." });
    const updated = await db.begin(async (transaction) => {
      const rows = await transaction<Array<{ count: number }>>`select count(*)::int as count from work_entries where work_day_id = ${workDay.id}`;
      if (rows[0]!.count === 0) return null;
      const [result] = await transaction`
        update work_days set state = 'SUBMITTED', submitted_at = now(), updated_at = now()
        where id = ${workDay.id} and state in ('DRAFT', 'RETURNED') returning id, state, submitted_at
      `;
      if (result) {
        await transaction`update work_entries set state = 'SUBMITTED', updated_at = now() where work_day_id = ${workDay.id} and state in ('DRAFT', 'RETURNED')`;
        await transaction`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'WORKDAY_SUBMITTED', 'WORK_DAY', ${workDay.id}, ${transaction.json(result)})
        `;
      }
      return result;
    });
    if (!updated) return reply.code(409).send({ error: "Pracovní den bez práce nebo v tomto stavu nelze odeslat." });
    return { workDay: updated };
  });

  app.delete("/api/workdays/:workDayId/entries/:entryId", { preHandler: [requireTrustedOrigin, own] }, async (request, reply) => {
    const params = z.object({ workDayId: z.string().uuid(), entryId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Neplatný pracovní úsek." });
    const removed = await db`
      delete from work_entries we using work_days wd
      where we.id = ${params.data.entryId} and we.work_day_id = ${params.data.workDayId}
        and wd.id = we.work_day_id and wd.employee_id = ${request.sessionUser!.employeeId}
        and wd.state in ('DRAFT', 'RETURNED') returning we.id
    `;
    if (!removed[0]) return reply.code(404).send({ error: "Pracovní úsek nelze odstranit." });
    return reply.code(204).send();
  });

  app.delete("/api/workdays/:workDayId/breaks/:breakId", { preHandler: [requireTrustedOrigin, own] }, async (request, reply) => {
    const params = z.object({ workDayId: z.string().uuid(), breakId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Neplatná přestávka." });
    const removed = await db`
      delete from break_entries b using work_days wd
      where b.id = ${params.data.breakId} and b.work_day_id = ${params.data.workDayId}
        and wd.id = b.work_day_id and wd.employee_id = ${request.sessionUser!.employeeId}
        and wd.state in ('DRAFT', 'RETURNED') returning b.id
    `;
    if (!removed[0]) return reply.code(404).send({ error: "Přestávku nelze odstranit." });
    return reply.code(204).send();
  });
}
