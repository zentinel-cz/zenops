import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { chromium } from "playwright-core";
import { z } from "zod";
import { requireAuthentication } from "./authorization.js";
import type { Database } from "./db.js";

const querySchema = z.object({ date: z.iso.date() });
const monthQuerySchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });

type ReportEntry = {
  id: string; employeeName: string; shiftType: string; workDayState: string; entryState: string;
  projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null;
  startAt: Date; endAt: Date; workedMinutes: number; breakMinutes: number;
  machineCode: string | null; machineName: string | null; enteredStartMth: string | null; endMth: string | null;
  machineFuelConsumed: string | null; machineFuelRefuelled: string | null; attachments: string[];
};

async function requireReportAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuthentication(request, reply);
  if (reply.sent) return;
  if (!request.sessionUser!.permissions.some((item) => item === "report.scoped.read" || item === "report.global.read")) {
    await reply.code(403).send({ error: "K reportům nemáte oprávnění." });
  }
}

async function buildDailyReport(db: Database, request: FastifyRequest, date: string) {
  const isGlobal = request.sessionUser!.permissions.includes("report.global.read");
  const entries = await db<ReportEntry[]>`
    select we.id, e.display_name as employee_name, wd.shift_type, wd.state as work_day_state,
      we.state as entry_state, p.code as project_code, p.name as project_name,
      wt.name as work_type_name, wa.name as work_activity_name, we.start_at, we.end_at,
      round(extract(epoch from (we.end_at - we.start_at)) / 60)::int as worked_minutes,
      coalesce((select round(sum(extract(epoch from (b.end_at - b.start_at))) / 60)::int
        from break_entries b where b.work_day_id = wd.id), 0) as break_minutes,
      m.code as machine_code, m.name as machine_name, mu.entered_start_mth, mu.end_mth,
      mu.fuel_consumed as machine_fuel_consumed, mu.fuel_refuelled as machine_fuel_refuelled,
      coalesce((select json_agg(a.code order by a.code) from attachment_usages au
        join attachments a on a.id = au.attachment_id where au.work_entry_id = we.id), '[]') as attachments
    from work_entries we join work_days wd on wd.id = we.work_day_id
    join employees e on e.id = wd.employee_id join projects p on p.id = we.project_id
    join work_types wt on wt.id = we.work_type_id left join work_activities wa on wa.id = we.work_activity_id
    left join machine_usages mu on mu.work_entry_id = we.id left join machines m on m.id = mu.machine_id
    where wd.work_date = ${date}
      and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
    order by p.code, e.display_name, we.start_at
  `;
  const trips = await db`
    select vt.id, e.display_name as driver_name, v.code as vehicle_code, v.registration_number,
      vt.start_at, vt.end_at, vt.start_odometer_km, vt.end_odometer_km, vt.fuel_consumed, vt.fuel_refuelled,
      coalesce((select json_agg(pe.display_name order by pe.display_name) from vehicle_trip_participants vtp
        join employees pe on pe.id = vtp.employee_id where vtp.vehicle_trip_id = vt.id and vtp.role = 'PASSENGER'), '[]') as passengers
    from vehicle_trips vt join work_days wd on wd.id = vt.driver_work_day_id
    join employees e on e.id = vt.driver_employee_id join vehicles v on v.id = vt.vehicle_id
    where wd.work_date = ${date} and (${isGlobal} or exists (
      select 1 from work_entries scoped join projects sp on sp.id = scoped.project_id
      where scoped.work_day_id = wd.id and sp.current_leader_employee_id = ${request.sessionUser!.employeeId}
    )) order by vt.start_at
  `;
  const fuelRecords = await db`
    select p.code as project_code, p.name as project_name, pfr.category, pfr.fuel_consumed,
      pfr.fuel_refuelled, pfr.note, e.display_name as recorded_by_name
    from project_fuel_records pfr join project_days pd on pd.id = pfr.project_day_id
    join projects p on p.id = pd.project_id join employees e on e.id = pfr.recorded_by_employee_id
    where pd.work_date = ${date} and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
    order by p.code, pfr.category
  `;
  const approvedMinutes = entries.filter((item) => item.entryState === "APPROVED").reduce((sum, item) => sum + item.workedMinutes, 0);
  const provisionalMinutes = entries.filter((item) => item.entryState !== "APPROVED").reduce((sum, item) => sum + item.workedMinutes, 0);
  return {
    date, scope: isGlobal ? "GLOBAL" : "LEADER", generatedAt: new Date().toISOString(),
    summary: { entries: entries.length, workers: new Set(entries.map((item) => item.employeeName)).size, approvedMinutes, provisionalMinutes },
    entries, trips, fuelRecords,
  };
}

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

function reportHtml(report: Awaited<ReturnType<typeof buildDailyReport>>): string {
  const rows = report.entries.map((item) => `<tr><td>${esc(item.projectCode)}<small>${esc(item.projectName)}</small></td><td>${esc(item.employeeName)}<small>${esc(item.shiftType)}</small></td><td>${esc(item.workTypeName)}${item.workActivityName ? `<small>${esc(item.workActivityName)}</small>` : ""}</td><td>${hours(item.workedMinutes)}<small>Přestávky dne: ${item.breakMinutes} min</small></td><td>${item.machineCode ? `${esc(item.machineCode)}<small>MTH ${esc(item.enteredStartMth)}–${esc(item.endMth)} · palivo ${esc(item.machineFuelConsumed ?? "–")}/${esc(item.machineFuelRefuelled ?? "–")}</small>` : "–"}</td><td><span class="state ${item.entryState === "APPROVED" ? "approved" : "provisional"}">${esc(item.entryState === "APPROVED" ? "SCHVÁLENO" : "PŘEDBĚŽNÉ")}</span></td></tr>`).join("");
  const tripRows = report.trips.map((item: any) => `<tr><td>${esc(item.vehicleCode)} · ${esc(item.registrationNumber)}</td><td>${esc(item.driverName)}</td><td>${esc(item.startOdometerKm)}–${esc(item.endOdometerKm)} km</td><td>${esc(item.fuelConsumed ?? "–")} / ${esc(item.fuelRefuelled ?? "–")}</td><td>${esc(item.passengers.join(", ") || "–")}</td></tr>`).join("");
  const fuelRows = report.fuelRecords.map((item: any) => `<tr><td>${esc(item.projectCode)} · ${esc(item.projectName)}</td><td>${esc(item.category)}</td><td>${esc(item.fuelConsumed ?? "–")}</td><td>${esc(item.fuelRefuelled ?? "–")}</td><td>${esc(item.recordedByName)}</td></tr>`).join("");
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:12px Arial;color:#17231c}header{display:flex;justify-content:space-between;border-bottom:3px solid #177847;padding-bottom:12px}h1{margin:0;font-size:25px}h2{margin:22px 0 8px;font-size:15px}.meta{color:#657269}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.summary div{padding:10px;border:1px solid #d7e0da;border-radius:7px}.summary strong{display:block;font-size:18px;color:#176b41}table{width:100%;border-collapse:collapse}th,td{padding:7px;border-bottom:1px solid #dfe5e1;text-align:left;vertical-align:top}th{background:#eef4ef;font-size:10px;text-transform:uppercase}small{display:block;color:#69776e;margin-top:3px}.state{padding:4px 6px;border-radius:10px;font-size:9px;font-weight:bold}.approved{color:#145c36;background:#d9f0e1}.provisional{color:#765315;background:#fff0c9}.empty{color:#758178}</style></head><body><header><div><b>ZENTINEL · ZENOPS</b><h1>Denní provozní report</h1></div><div class="meta">Datum: ${esc(report.date)}<br>Vygenerováno: ${esc(new Date(report.generatedAt).toLocaleString("cs-CZ"))}</div></header><section class="summary"><div><strong>${report.summary.workers}</strong>pracovníků</div><div><strong>${report.summary.entries}</strong>pracovních úseků</div><div><strong>${hours(report.summary.approvedMinutes)}</strong>schváleno</div><div><strong>${hours(report.summary.provisionalMinutes)}</strong>předběžně</div></section><h2>Práce a technika</h2>${rows ? `<table><thead><tr><th>Zakázka</th><th>Pracovník</th><th>Práce</th><th>Čas</th><th>Stroj / palivo</th><th>Stav</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="empty">Pro tento den nejsou dostupná data.</p>'}<h2>Vozidla</h2>${tripRows ? `<table><thead><tr><th>Vozidlo</th><th>Řidič</th><th>Kilometry</th><th>Spotřeba / tankování</th><th>Cestující</th></tr></thead><tbody>${tripRows}</tbody></table>` : '<p class="empty">Bez jízd.</p>'}<h2>Sdílené palivo zakázek</h2>${fuelRows ? `<table><thead><tr><th>Zakázka</th><th>Kategorie</th><th>Spotřeba</th><th>Tankování</th><th>Zapsal</th></tr></thead><tbody>${fuelRows}</tbody></table>` : '<p class="empty">Bez sdílených záznamů.</p>'}</body></html>`;
}

export function registerReportRoutes(app: FastifyInstance, db: Database): void {
  app.get("/api/reports/daily", { preHandler: requireReportAccess }, async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Neplatné datum reportu." });
    return { report: await buildDailyReport(db, request, query.data.date) };
  });
  app.get("/api/reports/daily.pdf", { preHandler: requireReportAccess }, async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Neplatné datum reportu." });
    const report = await buildDailyReport(db, request, query.data.date);
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium-browser", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      const page = await browser.newPage();
      await page.setContent(reportHtml(report), { waitUntil: "load" });
      const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true, margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" } });
      return reply.header("content-type", "application/pdf").header("content-disposition", `attachment; filename="zenops-denni-report-${query.data.date}.pdf"`).send(pdf);
    } finally {
      await browser.close();
    }
  });
  app.get("/api/reports/monthly", { preHandler: requireReportAccess }, async (request, reply) => {
    const query = monthQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "Neplatný měsíc reportu." });
    const monthStart = `${query.data.month}-01`;
    const isGlobal = request.sessionUser!.permissions.includes("report.global.read");
    const employeeHours = await db`
      select e.id, e.display_name, wd.shift_type,
        round(sum(extract(epoch from (we.end_at - we.start_at))) / 60)::int as worked_minutes,
        round(sum(extract(epoch from (we.end_at - we.start_at))) filter (where we.state = 'APPROVED') / 60)::int as approved_minutes
      from work_entries we join work_days wd on wd.id = we.work_day_id join employees e on e.id = wd.employee_id
      join projects p on p.id = we.project_id
      where wd.work_date >= ${monthStart}::date and wd.work_date < (${monthStart}::date + interval '1 month')
        and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
      group by e.id, wd.shift_type order by e.display_name, wd.shift_type
    `;
    const orderHours = await db`
      select p.id, p.code, p.name, p.status,
        round(sum(extract(epoch from (we.end_at - we.start_at))) / 60)::int as worked_minutes,
        count(distinct wd.employee_id)::int as workers
      from work_entries we join work_days wd on wd.id = we.work_day_id join projects p on p.id = we.project_id
      where wd.work_date >= ${monthStart}::date and wd.work_date < (${monthStart}::date + interval '1 month')
        and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
      group by p.id order by p.code
    `;
    const machines = await db`
      select m.id, m.code, m.name, sum(mu.end_mth - mu.entered_start_mth) as mth,
        sum(mu.fuel_consumed) as fuel_consumed, sum(mu.fuel_refuelled) as fuel_refuelled
      from machine_usages mu join machines m on m.id = mu.machine_id join work_entries we on we.id = mu.work_entry_id
      join work_days wd on wd.id = we.work_day_id join projects p on p.id = we.project_id
      where wd.work_date >= ${monthStart}::date and wd.work_date < (${monthStart}::date + interval '1 month')
        and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
      group by m.id order by m.code
    `;
    const vehicles = await db`
      select v.id, v.code, v.registration_number, sum(vt.end_odometer_km - vt.start_odometer_km) as kilometres,
        sum(vt.fuel_consumed) as fuel_consumed, sum(vt.fuel_refuelled) as fuel_refuelled
      from vehicle_trips vt join vehicles v on v.id = vt.vehicle_id join work_days wd on wd.id = vt.driver_work_day_id
      where wd.work_date >= ${monthStart}::date and wd.work_date < (${monthStart}::date + interval '1 month')
        and (${isGlobal} or exists (select 1 from work_entries we join projects p on p.id = we.project_id
          where we.work_day_id = wd.id and p.current_leader_employee_id = ${request.sessionUser!.employeeId}))
      group by v.id order by v.code
    `;
    const sharedFuel = await db`
      select p.id as project_id, p.code as project_code, sum(pfr.fuel_consumed) as fuel_consumed,
        sum(pfr.fuel_refuelled) as fuel_refuelled
      from project_fuel_records pfr join project_days pd on pd.id = pfr.project_day_id join projects p on p.id = pd.project_id
      where pd.work_date >= ${monthStart}::date and pd.work_date < (${monthStart}::date + interval '1 month')
        and (${isGlobal} or p.current_leader_employee_id = ${request.sessionUser!.employeeId})
      group by p.id order by p.code
    `;
    return { report: { month: query.data.month, scope: isGlobal ? "GLOBAL" : "LEADER", employeeHours, orderHours, machines, vehicles, sharedFuel } };
  });
}
