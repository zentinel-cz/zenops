import { fuelCategoryLabel } from "@zenops/contracts/labels";
import { useEffect, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";

type Entry = { id: string; employeeName: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null; workedMinutes: number; entryState: string; machineCode: string | null };
type Trip = { id: string; driverName: string; vehicleCode: string; registrationNumber: string; startOdometerKm: string; endOdometerKm: string; fuelConsumed: string | null; fuelRefuelled: string | null; passengers: string[] };
type Fuel = { projectCode: string; projectName: string; category: string; fuelConsumed: string | null; fuelRefuelled: string | null; recordedByName: string; note: string | null };
type Report = { date: string; summary: { entries: number; workers: number; approvedMinutes: number; provisionalMinutes: number }; entries: Entry[]; trips: Trip[]; fuelRecords: Fuel[] };

const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function ReportPanel() {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(""); setLoading(true);
    if (!date) { setLoading(false); return; }
    void fetch(`/api/reports/daily?date=${date}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ report: Report }>; })
      .then((body) => { if (!controller.signal.aborted) setReport(body.report); })
      .catch(() => { if (!controller.signal.aborted) setError("Denní report se nepodařilo načíst. Zkuste zvolit datum znovu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date]);

  return <section className="management-panel report-panel"><div className="section-heading"><div><p className="eyebrow">ŽIVÝ PROVOZNÍ PŘEHLED</p><h3>Denní report</h3></div><div className="report-controls"><input aria-label="Datum reportu" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><a className="download-button" href={report ? `/api/reports/daily.pdf?date=${report.date}` : undefined} aria-disabled={!report} download>Stáhnout PDF</a></div></div>{error && <p className="error">{error}</p>}{loading ? <p className="muted">Načítám aktuální data…</p> : report && <><div className="report-summary"><div><strong>{report.summary.workers}</strong><span>pracovníků</span></div><div><strong>{report.summary.entries}</strong><span>úseků</span></div><div><strong>{hours(report.summary.approvedMinutes)}</strong><span>schváleno</span></div><div><strong>{hours(report.summary.provisionalMinutes)}</strong><span>předběžně</span></div></div>{report.entries.length === 0 ? <p className="muted">Pro vybraný den nejsou dostupná data.</p> : <><ListSearch value={query} onChange={setQuery} label="Hledat v reportu podle zakázky, pracovníka, práce nebo stroje" /><div className="report-table"><div className="report-row report-head"><span>Zakázka</span><span>Pracovník</span><span>Práce</span><span>Čas</span><span>Stav</span></div>{report.entries.filter((entry) => matchesSearch(query, entry.projectCode, entry.projectName, entry.employeeName, entry.workTypeName, entry.workActivityName, entry.machineCode, entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné")).map((entry) => <div className="report-row" key={entry.id}><span data-label="Zakázka"><strong>{entry.projectCode}</strong><small>{entry.projectName}</small></span><span data-label="Pracovník">{entry.employeeName}</span><span data-label="Práce">{entry.workTypeName}{entry.workActivityName && <small>{entry.workActivityName}</small>}{entry.machineCode && <small>Stroj {entry.machineCode}</small>}</span><span data-label="Čas">{hours(entry.workedMinutes)}</span><span className={`report-state ${entry.entryState === "APPROVED" ? "approved" : "provisional"}`}>{entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné"}</span></div>)}{report.entries.length > 0 && !report.entries.some((entry) => matchesSearch(query, entry.projectCode, entry.projectName, entry.employeeName, entry.workTypeName, entry.workActivityName, entry.machineCode, entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné")) && <p className="muted">Žádný záznam neodpovídá hledání.</p>}</div></>}
      <section className="report-details" aria-label="Doprava"><h4>Doprava</h4>
        {report.trips.length === 0 ? <p className="muted">Pro tento den nejsou evidované jízdy.</p> : report.trips.map((trip) => <article className="report-detail-card" key={trip.id}>
          <strong>{trip.vehicleCode} · {trip.registrationNumber}</strong><p>Řidič: {trip.driverName}</p>
          <p>Tachometr: {trip.startOdometerKm}–{trip.endOdometerKm} km</p>
          <p>Spotřeba: {trip.fuelConsumed ?? "–"} l · Tankování: {trip.fuelRefuelled ?? "–"} l</p>
          <p>Spolucestující: {trip.passengers.length ? trip.passengers.join(", ") : "Bez spolucestujících"}</p>
        </article>)}
      </section>
      <section className="report-details" aria-label="Sdílené palivo"><h4>Sdílené palivo zakázek</h4>
        {report.fuelRecords.length === 0 ? <p className="muted">Pro tento den není evidované sdílené palivo.</p> : report.fuelRecords.map((fuel) => <article className="report-detail-card" key={`${fuel.projectCode}-${fuel.category}`}>
          <strong>{fuel.projectCode} · {fuel.projectName}</strong><p>{fuelCategoryLabel(fuel.category)}</p>
          <p>Spotřeba: {fuel.fuelConsumed ?? "–"} l · Tankování: {fuel.fuelRefuelled ?? "–"} l</p>
          <p>Zapsal: {fuel.recordedByName}</p>{fuel.note && <p>{fuel.note}</p>}
        </article>)}
      </section>
    </>}</section>;
}
