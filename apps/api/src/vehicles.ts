import { createVehicleTripSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, requireWorkerOnly, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

const paramsSchema = z.object({ workDayId: z.string().uuid() });
const passengerParams = paramsSchema.extend({ tripId: z.string().uuid() });

export function registerVehicleRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/workdays/:workDayId/vehicle-trips/available", {
    preHandler: [requireWorkerOnly, requirePermission("workday.own.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "Neplatný pracovní den." });
    const [day] = await db`select wd.work_date::text from work_days wd
      join monthly_periods mp on mp.id=wd.monthly_period_id where wd.id=${params.data.workDayId}
      and wd.employee_id=${request.sessionUser!.employeeId} and wd.state in ('DRAFT','RETURNED') and mp.state='OPEN'`;
    if (!day) return reply.code(409).send({ error: "Pracovní den nelze upravit v aktuálním stavu." });
    const trips = await db`select vt.id,vt.start_at,vt.end_at,v.code as vehicle_code,v.registration_number,
      e.display_name as driver_name from vehicle_trips vt join vehicles v on v.id=vt.vehicle_id
      join employees e on e.id=vt.driver_employee_id join work_days wd on wd.id=vt.driver_work_day_id
      join monthly_periods mp on mp.id=wd.monthly_period_id
      where wd.work_date=${day.workDate} and wd.state in ('DRAFT','RETURNED') and mp.state='OPEN'
        and vt.driver_employee_id<>${request.sessionUser!.employeeId}
        and not exists(select 1 from vehicle_trip_participants p where p.vehicle_trip_id=vt.id
          and p.employee_id=${request.sessionUser!.employeeId})
      order by vt.start_at,v.code,vt.id`;
    return { trips };
  });

  app.post("/api/workdays/:workDayId/vehicle-trips/:tripId/passenger", {
    preHandler: [requireTrustedOrigin, requireWorkerOnly, requirePermission("workday.own.manage")],
  }, async (request, reply) => {
    const params = passengerParams.safeParse(request.params);
    if (!params.success || !z.object({}).strict().safeParse(request.body ?? {}).success) {
      return reply.code(400).send({ error: "Cestující připojuje pouze sebe k existující jízdě, bez kilometrů a paliva." });
    }
    const result = await db.begin(async (transaction) => {
      const [trip] = await transaction`select driver_work_day_id from vehicle_trips where id=${params.data.tripId}`;
      if (!trip) return null;
      // Stable order handles two drivers joining one another without a lock cycle.
      const days = await transaction`select wd.id,wd.employee_id,wd.work_date::text,wd.state,mp.state as period_state
        from work_days wd join monthly_periods mp on mp.id=wd.monthly_period_id
        where wd.id in (${params.data.workDayId},${trip.driverWorkDayId}) order by wd.id for update of wd`;
      const own = days.find(day=>day.id===params.data.workDayId);
      const driver = days.find(day=>day.id===trip.driverWorkDayId);
      if (!own || !driver || own.employeeId!==request.sessionUser!.employeeId || own.workDate!==driver.workDate
        || ![own,driver].every(day=>['DRAFT','RETURNED'].includes(day.state) && day.periodState==='OPEN')
        || driver.employeeId===request.sessionUser!.employeeId) return null;
      const [lockedTrip] = await transaction`select id from vehicle_trips where id=${params.data.tripId} for update`;
      if (!lockedTrip) return null;
      const [membership] = await transaction`insert into vehicle_trip_participants(vehicle_trip_id,employee_id,role)
        values(${params.data.tripId},${request.sessionUser!.employeeId},'PASSENGER')
        on conflict(vehicle_trip_id,employee_id) do nothing returning vehicle_trip_id,employee_id,role`;
      if (membership) {
        await transaction`insert into audit_logs(actor_user_id,action,entity_type,entity_id,after_data)
          values(${request.sessionUser!.id},'VEHICLE_TRIP_PASSENGER_JOINED','VEHICLE_TRIP',${params.data.tripId},
            ${transaction.json({...membership,workDayId:own.id,driverEmployeeId:driver.employeeId})})`;
      }
      return { tripId: params.data.tripId, role: "PASSENGER" };
    });
    if (!result) return reply.code(409).send({ error: "K jízdě se nelze připojit. Oba dny musí být upravitelné, ve stejném datu a otevřeném měsíci. Odeslanou jízdu opraví Admin." });
    return { participant: result };
  });

  app.post("/api/workdays/:workDayId/vehicle-trips", {
    preHandler: [requireTrustedOrigin, requireWorkerOnly, requirePermission("workday.own.manage")],
  }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const parsed = createVehicleTripSchema.safeParse(request.body);
    if (!params.success || !parsed.success) return reply.code(400).send({ error: "Neplatné údaje jízdy." });
    if (parsed.data.passengerEmployeeIds.includes(request.sessionUser!.employeeId)) {
      return reply.code(422).send({ error: "Řidič nemůže být současně cestujícím." });
    }
    try {
      const trip = await db.begin(async (transaction) => {
        const contexts = await transaction<Array<{ id: string }>>`
          select wd.id from work_days wd join monthly_periods mp on mp.id = wd.monthly_period_id
          join vehicles v on v.id = ${parsed.data.vehicleId} and v.is_active
          where wd.id = ${params.data.workDayId} and wd.employee_id = ${request.sessionUser!.employeeId}
            and wd.state in ('DRAFT', 'RETURNED') and mp.state = 'OPEN' for update of wd
        `;
        if (!contexts[0]) return null;
        if (parsed.data.passengerEmployeeIds.length > 0) {
          const active = await transaction<Array<{ count: number }>>`
            select count(*)::int as count from employees
            where is_active and id in ${transaction(parsed.data.passengerEmployeeIds)}
          `;
          if (active[0]!.count !== parsed.data.passengerEmployeeIds.length) {
            throw Object.assign(new Error("Neplatný cestující."), { statusCode: 422 });
          }
        }
        const [created] = await transaction`
          insert into vehicle_trips (vehicle_id, driver_work_day_id, driver_employee_id, start_at, end_at,
            start_odometer_km, end_odometer_km, fuel_consumed, fuel_refuelled, note)
          values (${parsed.data.vehicleId}, ${params.data.workDayId}, ${request.sessionUser!.employeeId},
            ${parsed.data.startAt}, ${parsed.data.endAt}, ${parsed.data.startOdometerKm}, ${parsed.data.endOdometerKm},
            ${parsed.data.fuelConsumed ?? null}, ${parsed.data.fuelRefuelled ?? null}, ${parsed.data.note ?? null})
          returning id, vehicle_id, start_at, end_at, start_odometer_km, end_odometer_km, fuel_consumed, fuel_refuelled, note
        `;
        await transaction`
          insert into vehicle_trip_participants (vehicle_trip_id, employee_id, role)
          values (${created!.id}, ${request.sessionUser!.employeeId}, 'DRIVER')
        `;
        for (const employeeId of parsed.data.passengerEmployeeIds) {
          await transaction`
            insert into vehicle_trip_participants (vehicle_trip_id, employee_id, role)
            values (${created!.id}, ${employeeId}, 'PASSENGER')
          `;
        }
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'VEHICLE_TRIP_CREATED', 'VEHICLE_TRIP', ${created!.id},
            ${transaction.json({...created!,driverEmployeeId:request.sessionUser!.employeeId,passengerEmployeeIds:parsed.data.passengerEmployeeIds})})`;
        return created!;
      });
      if (!trip) return reply.code(404).send({ error: "Pracovní den nebo vozidlo nebylo nalezeno." });
      return reply.code(201).send({ trip });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23P01") {
        return reply.code(409).send({ error: "Vozidlo je v tomto čase použito jinou jízdou." });
      }
      throw error;
    }
  });
}
