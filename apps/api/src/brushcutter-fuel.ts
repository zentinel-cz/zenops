import type { FastifyInstance } from "fastify";
import type postgres from "postgres";
import { z } from "zod";
import { projectFuelSchema } from "@zenops/contracts";
import { requireAuthentication, requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";
import { saveProjectDay } from "./project-day-save.js";

export async function fuelRecorderSettings(db: Database | postgres.TransactionSql) {
  const [settings] = await db`select s.fuel_recorder_version as version,
    s.brushcutter_recorder_employee_id as employee_id,e.display_name,
    exists(select 1 from users u join user_roles ur on ur.user_id=u.id
      join roles r on r.id=ur.role_id and r.code='WORKER'
      where u.employee_id=e.id and u.is_active and e.is_active) as active
    from operational_settings s left join employees e on e.id=s.brushcutter_recorder_employee_id where s.id=1`;
  return settings!;
}

export function registerBrushcutterFuelRoutes(app: FastifyInstance, db: Database, origin: AuthorizationHook) {
  app.get('/api/settings/fuel-recorder', {preHandler: requireAuthentication}, async (request,reply) => {
    if (!request.sessionUser!.roles.some(role=>role==='ADMIN'||role==='WORKER'))
      return reply.code(403).send({error:'K této operaci nemáte oprávnění.'});
    const settings = await fuelRecorderSettings(db);
    const isAdmin = request.sessionUser!.roles.includes('ADMIN');
    return reply.header('cache-control','no-store').send(isAdmin ? {settings} : {
      assigned: settings.active && settings.employeeId === request.sessionUser!.employeeId,
    });
  });
  const assignmentSchema = z.object({employeeId:z.string().uuid().nullable(),expectedVersion:z.number().int().min(0),reason:z.string().trim().min(3).max(500)}).strict();
  app.put('/api/settings/fuel-recorder', {preHandler:[origin,requirePermission('settings.manage')]}, async (request,reply) => {
    if (!request.sessionUser!.roles.includes('ADMIN')) return reply.code(403).send({error:'Nastavení mění pouze Admin.'});
    const parsed = assignmentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error:'Vyberte pracovníka a uveďte důvod změny.'});
    const result = await db.begin(async t=>{
      await t`select id from operational_settings where id=1 for update`;
      const before = await fuelRecorderSettings(t);
      if (before.version !== parsed.data.expectedVersion) return {error:'Nastavení mezitím změnil jiný Admin. Obnovte ho.',status:409};
      if (parsed.data.employeeId) {
        const [worker] = await t`select e.id from employees e join users u on u.employee_id=e.id
          join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id and r.code='WORKER'
          where e.id=${parsed.data.employeeId} and e.is_active and u.is_active for share of e,u`;
        if (!worker) return {error:'Vyberte aktivní účet s rolí Pracovník.',status:422};
      }
      await t`update operational_settings set brushcutter_recorder_employee_id=${parsed.data.employeeId},
        fuel_recorder_version=fuel_recorder_version+1 where id=1`;
      const after = await fuelRecorderSettings(t);
      await t`insert into audit_logs(actor_user_id,action,entity_type,before_data,after_data,reason)
        values(${request.sessionUser!.id},'FUEL_RECORDER_UPDATED','OPERATIONAL_SETTINGS',${t.json(before)},${t.json(after)},${parsed.data.reason})`;
      return {settings:after};
    });
    if ('error' in result) return reply.code(result.status!).send({error:result.error});
    return result;
  });

  const params = z.object({projectId:z.string().uuid()});
  const query = z.object({date:z.iso.date()});
  app.get('/api/projects/:projectId/brushcutter-fuel', {preHandler:requireAuthentication}, async(request,reply)=>{
    const p=params.safeParse(request.params), q=query.safeParse(request.query);
    if (!p.success || !q.success) return reply.code(400).send({error:'Neplatná zakázka nebo datum.'});
    // Assignment, account eligibility, project and fuel are read in one snapshot.
    const [result] = await db`select p.id,
      (select json_build_object('fuelConsumed',f.fuel_consumed::text,'fuelRefuelled',f.fuel_refuelled::text,
        'note',f.note,'recordedByName',e.display_name,'clearedAt',f.cleared_at)
       from project_days pd join project_fuel_records f on f.project_day_id=pd.id
       join employees e on e.id=f.recorded_by_employee_id
       where pd.project_id=p.id and pd.work_date=${q.data.date} and f.category='BRUSHCUTTER') as fuel_record
      from projects p join operational_settings s on s.id=1
      where p.id=${p.data.projectId} and p.status='OPEN'
        and (${request.sessionUser!.roles.includes('ADMIN')} or
          (s.brushcutter_recorder_employee_id=${request.sessionUser!.employeeId}
           and exists(select 1 from users u join employees e on e.id=u.employee_id
             join user_roles ur on ur.user_id=u.id join roles r on r.id=ur.role_id and r.code='WORKER'
             where u.id=${request.sessionUser!.id} and u.is_active and e.is_active)))`;
    if (!result) return reply.code(403).send({error:'Palivo zapisuje pouze pracovník určený Adminem u otevřené zakázky.'});
    return reply.header('cache-control','no-store').send({fuelRecord:result.fuelRecord});
  });
  app.put('/api/projects/:projectId/brushcutter-fuel',{preHandler:[origin,requireAuthentication]},async(request,reply)=>{
    const p=params.safeParse(request.params), q=query.safeParse(request.query), body=projectFuelSchema.strict().safeParse(request.body);
    if (!p.success || !q.success || !body.success) return reply.code(400).send({error:'Neplatný záznam paliva.'});
    const {fuelRecord}=await saveProjectDay(db,request.sessionUser!,p.data.projectId,q.data.date,{fuel:body.data});
    return {fuelRecord};
  });
}
