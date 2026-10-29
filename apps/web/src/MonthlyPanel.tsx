import { businessDate } from "@zenops/contracts/time";
import { shiftLabel, projectStatusLabel } from "@zenops/contracts/labels";
import type { SessionUser } from "@zenops/contracts";
import { useEffect, useRef, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";

type MonthlyReport = {
  month: string;
  employeeHours: Array<{ id: string; displayName: string; shiftType: string; workedMinutes: number; approvedMinutes: number }>;
  orderHours: Array<{ id: string; code: string; name: string; status: string; workedMinutes: number; workers: number }>;
  machines: Array<{ id: string; code: string; name: string; mth: string | null; fuelConsumed: string | null; fuelRefuelled: string | null }>;
  vehicles: Array<{ id: string; code: string; registrationNumber: string; kilometres: string | null; fuelConsumed: string | null; fuelRefuelled: string | null }>;
  sharedFuel: Array<{ projectId: string; projectCode: string; fuelConsumed: string | null; fuelRefuelled: string | null }>;
};
type Period = { state: "OPEN" | "CLOSED"; totalWorkDays: number; unresolvedWorkDays: number; cancelledWorkDays: number; closedAt: string | null; reopenReason: string | null };
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function MonthlyPanel({ user }: { user: SessionUser }) {
  const [month, setMonth] = useState(businessDate().slice(0, 7));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestVersion = useRef(0);
  const canManagePeriod = user.permissions.includes("period.manage");

  async function load() {
    const version = ++requestVersion.current;
    setReport(null); setPeriod(null); setLoading(true);
    try {
      if (!month) return;
      const responses = await Promise.all([
        fetch(`/api/reports/monthly?month=${month}`, { credentials: "include" }),
        ...(canManagePeriod ? [fetch(`/api/periods/${month}`, { credentials: "include" })] : []),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error();
      const bodies = await Promise.all(responses.map((response) => response.json()));
      if (version !== requestVersion.current) return;
      setReport((bodies[0] as { report: MonthlyReport }).report);
      if (canManagePeriod) setPeriod((bodies[1] as { period: Period }).period);
    } catch {
      if (version === requestVersion.current) setMessage("Měsíční přehled se nepodařilo načíst. Zvolte měsíc znovu.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    setMessage(""); setReason(""); void load();
    return () => { requestVersion.current++; };
  }, [month, canManagePeriod]);

  async function changePeriod() {
    if (!period || saving || loading) return;
    setSaving(true); setMessage("");
    const action = period.state === "OPEN" ? "CLOSE" : "REOPEN";
    try {
      const response = await fetch(`/api/periods/${month}/action`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "CLOSE" ? { action } : { action, reason }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setMessage(body.error ?? "Změna období se nezdařila."); return; }
      setReason(""); setMessage(action === "CLOSE" ? "Měsíc byl uzavřen." : "Měsíc byl znovu otevřen."); await load();
    } catch { setMessage("Nepodařilo se spojit se serverem. Zkontrolujte připojení."); }
    finally { setSaving(false); }
  }

  return <section className="management-panel monthly-panel"><div className="section-heading"><div><p className="eyebrow">MĚSÍČNÍ PROVOZ</p><h3>Souhrny a uzávěrka</h3></div><input className="month-input" aria-label="Měsíc reportu" type="month" disabled={saving} value={month} onChange={(event) => setMonth(event.target.value)} /></div>{message && <p className={message.includes("ne") ? "error" : "form-message"}>{message}</p>}{loading && <p role="status">Načítám přehled a stav měsíce…</p>}{canManagePeriod && period && <div className="period-card"><div><span className={`state-badge ${period.state.toLowerCase()}`}>{period.state === "OPEN" ? "OTEVŘENÝ" : "UZAVŘENÝ"}</span><strong>{period.totalWorkDays} pracovních dnů</strong><small>{period.unresolvedWorkDays ? `${period.unresolvedWorkDays} čeká na vyřešení` : "Všechny záznamy jsou vyřešené"}</small>{period.cancelledWorkDays > 0 && <small>Zrušené prázdné dny: {period.cancelledWorkDays} · neblokují uzávěrku</small>}</div>{period.state === "CLOSED" && <label>Důvod znovuotevření<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>}<button disabled={saving || loading || (period.state === "OPEN" ? period.unresolvedWorkDays > 0 : reason.trim().length < 3)} onClick={() => void changePeriod()}>{period.state === "OPEN" ? "Uzavřít měsíc" : "Znovu otevřít měsíc"}</button></div>}{report && <div className="monthly-grids"><SummaryList title="Hodiny podle pracovníků" rows={report.employeeHours.map((row) => ({ key: `${row.id}-${row.shiftType}`, title: row.displayName, detail: `${shiftLabel(row.shiftType)} · schváleno ${hours(row.approvedMinutes ?? 0)}`, value: hours(row.workedMinutes) }))} /><SummaryList title="Hodiny podle zakázek" rows={report.orderHours.map((row) => ({ key: row.id, title: `${row.code} · ${row.name}`, detail: `${row.workers} pracovníků · ${projectStatusLabel(row.status)}`, value: hours(row.workedMinutes) }))} /><SummaryList title="Stroje" rows={report.machines.map((row) => ({ key: row.id, title: `${row.code} · ${row.name}`, detail: `Palivo ${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}`, value: `${row.mth ?? "0"} MTH` }))} /><SummaryList title="Vozidla" rows={report.vehicles.map((row) => ({ key: row.id, title: `${row.code} · ${row.registrationNumber}`, detail: `Palivo ${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}`, value: `${row.kilometres ?? "0"} km` }))} /><SummaryList title="Sdílené palivo zakázek" rows={report.sharedFuel.map((row) => ({ key: row.projectId, title: row.projectCode, detail: "Spotřeba / tankování", value: `${row.fuelConsumed ?? "–"} / ${row.fuelRefuelled ?? "–"}` }))} /></div>}</section>;
}

function SummaryList({ title, rows }: { title: string; rows: Array<{ key: string; title: string; detail: string; value: string }> }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => matchesSearch(query, row.title, row.detail, row.value));
  return <div className="monthly-list"><h4>{title}</h4>{rows.length === 0 ? <p className="muted">Bez dat.</p> : <><ListSearch value={query} onChange={setQuery} label={`Hledat: ${title.toLocaleLowerCase("cs-CZ")}`} />{filtered.length ? filtered.map((row) => <div key={row.key}><span><strong>{row.title}</strong><small>{row.detail}</small></span><b>{row.value}</b></div>) : <p className="muted">Žádná položka neodpovídá hledání.</p>}</>}</div>;
}
