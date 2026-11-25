import { updateShiftPresetsSchema, type ShiftPreset } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { requireAuthentication, requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

export function registerSettingsRoutes(app: FastifyInstance, db: Database, origin: AuthorizationHook) {
  app.get("/api/settings/shift-presets", { preHandler: requireAuthentication }, async (request, reply) => {
    if (!request.sessionUser!.roles.some(role => role === "ADMIN" || role === "WORKER"))
      return reply.code(403).send({ error: "Nastavení směn je dostupné Adminovi a Pracovníkovi." });
    // One statement keeps the version and values in the same committed snapshot.
    const [settings] = await db`select version, (select jsonb_agg(jsonb_build_object(
      'shiftType',shift_type,'startTime',left(start_time::text,5),'endTime',left(end_time::text,5))
      order by case shift_type when 'MORNING' then 1 else 2 end)
      from shift_presets where shift_type in ('MORNING','NIGHT')) as presets from operational_settings where id=1`;
    return reply.header("cache-control", "no-store").send({ settings });
  });

  app.put("/api/settings/shift-presets", { preHandler: [origin, requirePermission("settings.manage")] }, async (request, reply) => {
    if (!request.sessionUser!.roles.includes("ADMIN")) return reply.code(403).send({ error: "Nastavení mění pouze Admin." });
    const parsed = updateShiftPresetsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "U každé směny vyplňte oba různé časy, nebo oba vymažte. Uveďte důvod změny." });
    const result = await db.begin(async transaction => {
      const [version] = await transaction`select version from operational_settings where id=1 for update`;
      if (version!.version !== parsed.data.expectedVersion) return null;
      const before = await transaction`select shift_type,start_time::text,end_time::text from shift_presets order by shift_type`;
      for (const preset of parsed.data.presets) {
        await transaction`update shift_presets set start_time=${preset.startTime}::time,end_time=${preset.endTime}::time
          where shift_type=${preset.shiftType}`;
      }
      const [after] = await transaction`update operational_settings set version=version+1 where id=1 returning version`;
      await transaction`insert into audit_logs(actor_user_id,action,entity_type,before_data,after_data,reason)
        values(${request.sessionUser!.id},'SHIFT_PRESETS_UPDATED','OPERATIONAL_SETTINGS',${transaction.json(before)},
          ${transaction.json({version:after!.version,presets:parsed.data.presets})},${parsed.data.reason})`;
      return { version: after!.version, presets: parsed.data.presets as ShiftPreset[] };
    });
    if (!result) return reply.code(409).send({ error: "Nastavení mezitím změnil jiný Admin. Obnovte ho a zkontrolujte časy." });
    return { settings: result };
  });
}
