import { createVehicleTripSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requirePermission, requireWorkerOnly, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

const paramsSchema = z.object({ workDayId: z.string().uuid() });

export function registerVehicleRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
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
          values (${request.sessionUser!.id}, 'VEHICLE_TRIP_CREATED', 'VEHICLE_TRIP', ${created!.id}, ${transaction.json(created!)})`;
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
