import { businessDate } from "@zenops/contracts/time";
import { fuelCategoryLabel } from "@zenops/contracts/labels";
import { useEffect, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";

type Entry = { id: string; employeeName: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null; workedMinutes: number; entryState: string; machineCode: string | null; machineName: string | null; enteredStartMth: string | null; endMth: string | null; machineFuelConsumed: string | null; machineFuelRefuelled: string | null; attachments: string[]; breakMinutes: number };
type Trip = { id: string; driverName: string; vehicleCode: string; registrationNumber: string; startOdometerKm: string; endOdometerKm: string; fuelConsumed: string | null; fuelRefuelled: string | null; passengers: string[] };
type Fuel = { projectCode: string; projectName: string; category: string; fuelConsumed: string | null; fuelRefuelled: string | null; recordedByName: string; note: string | null };
type Report = { date: string; summary: { entries: number; workers: number; approvedMinutes: number; provisionalMinutes: number }; entries: Entry[]; trips: Trip[]; fuelRecords: Fuel[] };

const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function ReportPanel() {
  const [date, setDate] = useState(businessDate());
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(""); setDownloadError(""); setLoading(true);
    if (!date) { setLoading(false); return; }
    void fetch(`/api/reports/daily?date=${date}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ report: Report }>; })
      .then((body) => { if (!controller.signal.aborted) setReport(body.report); })
      .catch(() => { if (!controller.signal.aborted) setError("Denní report se nepodařilo načíst. Zkuste zvolit datum znovu."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date]);

  async function downloadPdf() {
    if (!report || downloading || loading || report.date !== date) return;
    setDownloading(true); setDownloadError("");
    try {
      const response = await fetch(`/api/reports/daily.pdf?date=${report.date}`, { credentials: "include" });
      if (!response.ok) {
        if (response.status === 401) throw new Error("Přihlášení vypršelo. Přihlaste se znovu.");
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "PDF se nepodařilo stáhnout. Zkuste to znovu.");
      }
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("Server nevrátil PDF. Zkuste to znovu.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `zenops-denni-report-${report.date}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      // Allow Safari time to consume the download before releasing the URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Stažení selhalo. Zkontrolujte připojení a zkuste to znovu.");
    } finally { setDownloading(false); }
  }

  return <section className="management-panel report-panel"><div className="section-heading"><div><p className="eyebrow">ŽIVÝ PROVOZNÍ PŘEHLED</p><h3>Denní report</h3></div><div className="report-controls"><input aria-label="Datum reportu" type="date" disabled={downloading} value={date} onChange={(event) => setDate(event.target.value)} /><button className="download-button" type="button" disabled={!report || loading || downloading || report.date !== date} onClick={() => void downloadPdf()}>{downloading ? "Připravuji PDF…" : "Stáhnout PDF"}</button></div></div>{error && <p className="error" role="alert">{error}</p>}{downloadError && <p className="error" role="alert">{downloadError}</p>}{loading ? <p className="muted">Načítám aktuální data…</p> : report && <><div className="report-summary"><div><strong>{report.summary.workers}</strong><span>pracovníků</span></div><div><strong>{report.summary.entries}</strong><span>úseků</span></div><div><strong>{hours(report.summary.approvedMinutes)}</strong><span>schváleno</span></div><div><strong>{hours(report.summary.provisionalMinutes)}</strong><span>předběžně</span></div></div>{report.entries.length === 0 ? <p className="muted">Pro vybraný den nejsou dostupná data.</p> : <><ListSearch value={query} onChange={setQuery} label="Hledat v reportu podle zakázky, pracovníka, práce nebo stroje" /><div className="report-table"><div className="report-row report-head"><span>Zakázka</span><span>Pracovník</span><span>Práce</span><span>Čas</span><span>Stav</span></div>{report.entries.filter((entry) => matchesSearch(query, entry.projectCode, entry.projectName, entry.employeeName, entry.workTypeName, entry.workActivityName, entry.machineCode, entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné")).map((entry) => <div className="report-row" key={entry.id}><span data-label="Zakázka"><strong>{entry.projectCode}</strong><small>{entry.projectName}</small></span><span data-label="Pracovník">{entry.employeeName}</span><span data-label="Práce">{entry.workTypeName}{entry.workActivityName && <small>{entry.workActivityName}</small>}{entry.machineCode && <small>Stroj {entry.machineCode} · {entry.machineName}<br />MTH {entry.enteredStartMth}–{entry.endMth}<br />Spotřeba {entry.machineFuelConsumed ?? "–"} l · Tankování {entry.machineFuelRefuelled ?? "–"} l</small>}{entry.attachments.length > 0 && <small>Příslušenství: {entry.attachments.join(", ")}</small>}</span><span data-label="Čas">{hours(entry.workedMinutes)}<small>Přestávky dne: {entry.breakMinutes} min</small></span><span className={`report-state ${entry.entryState === "APPROVED" ? "approved" : "provisional"}`}>{entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné"}</span></div>)}{report.entries.length > 0 && !report.entries.some((entry) => matchesSearch(query, entry.projectCode, entry.projectName, entry.employeeName, entry.workTypeName, entry.workActivityName, entry.machineCode, entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné")) && <p className="muted">Žádný záznam neodpovídá hledání.</p>}</div></>}
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
