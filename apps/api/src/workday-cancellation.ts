import type { SessionUser } from "@zenops/contracts";
import type { Database } from "./db.js";

export async function changeEmptyWorkDay(db: Database, workDayId: string, actor: SessionUser,
  input: { action: "CANCEL"; reason: string } | { action: "RESTORE"; reason: string; shiftType: "MORNING" | "NIGHT" }) {
  return db.begin(async (transaction) => {
    const [day] = await transaction`
      select * from work_days where id=${workDayId}
        and (${input.action === "CANCEL" && actor.roles.includes("ADMIN")} or employee_id=${actor.employeeId}) for update
    `;
    if (!day) return null;
    if ((input.action === "CANCEL" && day.state !== "DRAFT") || (input.action === "RESTORE" && day.state !== "CANCELLED")) {
      throw Object.assign(new Error("Den již není ve stavu, který umožňuje tuto operaci."), { statusCode: 409 });
    }
    await transaction`select set_config('zenops.actor_user_id',${actor.id},true),set_config('zenops.change_reason',${input.reason},true)`;
    const [changed] = await transaction`
      update work_days set state=${input.action === "CANCEL" ? "CANCELLED" : "DRAFT"},
        shift_type=${input.action === "RESTORE" ? input.shiftType : day.shiftType}
      where id=${day.id} returning id,work_date,shift_type,state,cancelled_at,cancellation_reason
    `;
    return changed;
  });
}
