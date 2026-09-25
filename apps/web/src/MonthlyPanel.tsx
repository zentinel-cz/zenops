import type { SessionUser } from "@zenops/contracts";
import { useEffect, useState } from "react";

type MonthlyReport = {
  month: string;
  employeeHours: Array<{ id: string; displayName: string; shiftType: string; workedMinutes: number; approvedMinutes: number }>;
  orderHours: Array<{ id: string; code: string; name: string; status: string; workedMinutes: number; workers: number }>;
  machines: Array<{ id: string; code: string; name: string; mth: string | null; fuelConsumed: string | null; fuelRefuelled: string | null }>;
  vehicles: Array<{ id: string; code: string; registrationNumber: string; kilometres: string | null; fuelConsumed: string | null; fuelRefuelled: string | null }>;
  sharedFuel: Array<{ projectId: string; projectCode: string; fuelConsumed: string | null; fuelRefuelled: string | null }>;
};
type Period = { state: "OPEN" | "CLOSED"; totalWorkDays: number; unresolvedWorkDays: number; closedAt: string | null; reopenReason: string | null };
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function MonthlyPanel({ user }: { user: SessionUser }) {
  const [month, setMonth] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const canManagePeriod = user.permissions.includes("period.manage");

  async function load() {
    setMessage("");
    const reportResponse = await fetch(`/api/reports/monthly?month=${month}`, { credentials: "include" });
    if (!reportResponse.ok) { setMessage("Měsíční report se nepodařilo načíst."); return; }
    setReport((await reportResponse.json() as { report: MonthlyReport }).report);
    if (canManagePeriod) {
      const periodResponse = await fetch(`/api/periods/${month}`, { credentials: "include" });
      if (periodResponse.ok) setPeriod((await periodResponse.json() as { period: Period }).period);
    }
  }
  useEffect(() => { void load(); }, [month]);

  async function changePeriod() {
    if (!period) return;
    const action = period.state === "OPEN" ? "CLOSE" : "REOPEN";
    const response = await fetch(`/api/periods/${month}/action`, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "CLOSE" ? { action } : { action, reason }),
    });
    const body = await response.json().catch(() => ({ error: "Změna období se nezdařila." })) as { error?: string };
    if (!response.ok) { setMessage(body.error ?? "Změna období se nezdařila."); return; }
    setReason(""); setMessage(action === "CLOSE" ? "Měsíc byl uzavřen." : "Měsíc byl znovu otevřen."); await load();
  }

  return <section className="management-panel monthly-panel"><div className="section-heading"><div><p className="eyebrow">MĚSÍČNÍ PROVOZ</p><h3>Souhrny a uzávěrka</h3></div><input className="month-input" aria-label="Měsíc reportu" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>{message && <p className={message.includes("ne") ? "error" : "form-message"}>{message}</p>}{canManagePeriod && period && <div className="period-card"><div><span className={`state-badge ${period.state.toLowerCase()}`}>{period.state === "OPEN" ? "OTEVŘENÝ" : "UZAVŘENÝ"}</span><strong>{period.totalWorkDays} pracovních dnů</strong><small>{period.unresolvedWorkDays ? `${period.unresolvedWorkDays} čeká na vyřešení` : "Všechny záznamy jsou vyřešené"}</small></div>{period.state === "CLOSED" && <label>Důvod znovuotevření<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>}<button disabled={period.state === "OPEN" ? period.unresolvedWorkDays > 0 : reason.trim().length < 3} onClick={() => void changePeriod()}>{period.state === "OPEN" ? "Uzavřít měsíc" : "Znovu otevřít měsíc"}</button></div>}{report && <div className="monthly-grids"><SummaryList title="Hodiny podle pracovníků" rows={report.employeeHours.map((row) => ({ key: `${row.id}-${row.shiftType}`, title: row.displayName, detail: `${row.shiftType} · schváleno ${hours(row.approvedMinutes ?? 0)}`, value: hours(row.workedMinutes) }))} /><SummaryList title="Hodiny podle zakázek" rows={report.orderHours.map((row) => ({ key: row.id, title: `${row.code} · ${row.name}`, detail: `${row.workers} pracovníků · ${row.status}`, value: hours(row.workedMinutes) }))} /><SummaryList title="Stroje" rows={report.machines.map((row) => ({ key: row.id, title: `${row.code} · ${row.name}`, detail: `Palivo ${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}`, value: `${row.mth ?? "0"} MTH` }))} /><SummaryList title="Vozidla" rows={report.vehicles.map((row) => ({ key: row.id, title: `${row.code} · ${row.registrationNumber}`, detail: `Palivo ${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}`, value: `${row.kilometres ?? "0"} km` }))} /><SummaryList title="Sdílené palivo zakázek" rows={report.sharedFuel.map((row) => ({ key: row.projectId, title: row.projectCode, detail: "Spotřeba / tankování", value: `${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}` }))} /></div>}</section>;
}

function SummaryList({ title, rows }: { title: string; rows: Array<{ key: string; title: string; detail: string; value: string }> }) {
  return <div className="monthly-list"><h4>{title}</h4>{rows.length === 0 ? <p className="muted">Bez dat.</p> : rows.map((row) => <div key={row.key}><span><strong>{row.title}</strong><small>{row.detail}</small></span><b>{row.value}</b></div>)}</div>;
}
