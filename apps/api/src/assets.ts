import { createAttachmentSchema, createMachineSchema, createVehicleSchema, machineUsageSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, requireWorkerOnly, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

export function registerAssetRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/assets", { preHandler: requirePermission("project.read_open") }, async (request) => {
    const machines = await db`
      select m.id, m.code, m.name, mt.name as type_name, mt.tracks_mth,
        (select mu.end_mth from machine_usages mu where mu.machine_id = m.id and mu.end_mth is not null order by mu.end_at desc limit 1) as latest_mth
      from machines m join machine_types mt on mt.id = m.machine_type_id where m.is_active order by m.code
    `;
    const attachments = await db`
      select a.id, a.code, a.name, at.name as type_name, at.uniquely_tracked
      from attachments a join attachment_types at on at.id = a.attachment_type_id where a.is_active order by a.code
    `;
    const vehicles = await db`
      select id, code, name, registration_number from vehicles where is_active order by code
    `;
    const employees = await db`
      select id, display_name from employees
      where is_active and id <> ${request.sessionUser!.employeeId} order by display_name
    `;
    return { machines, attachments, vehicles, employees };
  });

  app.post("/api/assets/machines", { preHandler: [requireTrustedOrigin, requirePermission("asset.manage")] }, async (request, reply) => {
    const parsed = createMachineSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje stroje." });
    try {
      const machine = await db.begin(async (transaction) => {
        const [type] = await transaction<Array<{ id: string }>>`
          insert into machine_types (name, tracks_mth) values (${parsed.data.typeName}, ${parsed.data.tracksMth})
          on conflict (name) do update set name = excluded.name returning id
        `;
        const [created] = await transaction`
          insert into machines (machine_type_id, code, name) values (${type!.id}, ${parsed.data.code}, ${parsed.data.name})
          returning id, code, name
        `;
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'MACHINE_CREATED', 'MACHINE', ${created!.id}, ${transaction.json(created!)})`;
        return created!;
      });
      return reply.code(201).send({ machine });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "Stroj s tímto kódem již existuje." });
      throw error;
    }
  });

  app.post("/api/assets/attachments", { preHandler: [requireTrustedOrigin, requirePermission("asset.manage")] }, async (request, reply) => {
    const parsed = createAttachmentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje příslušenství." });
    try {
      const attachment = await db.begin(async (transaction) => {
        const [type] = await transaction<Array<{ id: string }>>`
          insert into attachment_types (name, uniquely_tracked) values (${parsed.data.typeName}, ${parsed.data.uniquelyTracked})
          on conflict (name) do update set name = excluded.name returning id
        `;
        const [created] = await transaction`
          insert into attachments (attachment_type_id, code, name) values (${type!.id}, ${parsed.data.code}, ${parsed.data.name})
          returning id, code, name
        `;
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'ATTACHMENT_CREATED', 'ATTACHMENT', ${created!.id}, ${transaction.json(created!)})`;
        return created!;
      });
      return reply.code(201).send({ attachment });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "Příslušenství s tímto kódem již existuje." });
      throw error;
    }
  });

  app.post("/api/assets/vehicles", { preHandler: [requireTrustedOrigin, requirePermission("asset.manage")] }, async (request, reply) => {
    const parsed = createVehicleSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje vozidla." });
    try {
      const vehicle = await db.begin(async (transaction) => {
        const [created] = await transaction`
          insert into vehicles (code, name, registration_number)
          values (${parsed.data.code}, ${parsed.data.name}, ${parsed.data.registrationNumber})
          returning id, code, name, registration_number
        `;
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'VEHICLE_CREATED', 'VEHICLE', ${created!.id}, ${transaction.json(created!)})`;
        return created!;
      });
      return reply.code(201).send({ vehicle });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "Vozidlo s tímto kódem nebo SPZ již existuje." });
      throw error;
    }
  });

  app.post("/api/workdays/:workDayId/entries/:entryId/machine", {
    preHandler: [requireTrustedOrigin, requireWorkerOnly, requirePermission("workday.own.manage")],
  }, async (request, reply) => {
    const params = z.object({ workDayId: z.string().uuid(), entryId: z.string().uuid() }).safeParse(request.params);
    const parsed = machineUsageSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ error: "Neplatné použití stroje." });
    try {
      const usage = await db.begin(async (transaction) => {
        const context = await transaction<Array<{ startAt: Date; endAt: Date; tracksMth: boolean; suggestedMth: string | null }>>`
          select we.start_at, we.end_at, mt.tracks_mth,
            (select previous.end_mth from machine_usages previous where previous.machine_id = m.id and previous.end_mth is not null order by previous.end_at desc limit 1) as suggested_mth
          from work_entries we join work_days wd on wd.id = we.work_day_id
          join machines m on m.id = ${parsed.data.machineId} and m.is_active
          join machine_types mt on mt.id = m.machine_type_id
          where we.id = ${params.data.entryId} and wd.id = ${params.data.workDayId}
            and wd.employee_id = ${request.sessionUser!.employeeId} and wd.state in ('DRAFT', 'RETURNED')
          for update of we
        `;
        if (!context[0]) return null;
        if (context[0].tracksMth && (parsed.data.startMth == null || parsed.data.endMth == null)) {
          throw Object.assign(new Error("Stroj vyžaduje počáteční i konečný MTH."), { statusCode: 422 });
        }
        const [created] = await transaction`
          insert into machine_usages (work_entry_id, machine_id, start_at, end_at, suggested_start_mth,
            entered_start_mth, end_mth, fuel_consumed, fuel_refuelled)
          values (${params.data.entryId}, ${parsed.data.machineId}, ${context[0].startAt}, ${context[0].endAt},
            ${context[0].suggestedMth}, ${parsed.data.startMth ?? null}, ${parsed.data.endMth ?? null},
            ${parsed.data.fuelConsumed ?? null}, ${parsed.data.fuelRefuelled ?? null}) returning *
        `;
        for (const attachmentId of parsed.data.attachmentIds) {
          await transaction`
            insert into attachment_usages (machine_usage_id, work_entry_id, attachment_id, start_at, end_at)
            select ${created!.id}, ${params.data.entryId}, id, ${context[0].startAt}, ${context[0].endAt}
            from attachments where id = ${attachmentId} and is_active
          `;
        }
        if (context[0].suggestedMth != null && Number(context[0].suggestedMth) !== parsed.data.startMth) {
          await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
            values (${request.sessionUser!.id}, 'MACHINE_START_MTH_OVERRIDDEN', 'MACHINE_USAGE', ${created!.id},
              ${transaction.json({ suggestedStartMth: context[0].suggestedMth })}, ${transaction.json({ enteredStartMth: parsed.data.startMth })})`;
        }
        return created!;
      });
      if (!usage) return reply.code(404).send({ error: "Pracovní úsek nebo stroj nebyl nalezen." });
      return reply.code(201).send({ usage });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23P01") return reply.code(409).send({ error: "Stroj nebo příslušenství je v tomto čase používáno jinde." });
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "K pracovnímu úseku již je stroj připojen." });
      throw error;
    }
  });
}
