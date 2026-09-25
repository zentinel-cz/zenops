import { useEffect, useState } from "react";

type Entry = { id: string; employeeName: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null; workedMinutes: number; entryState: string; machineCode: string | null };
type Report = { date: string; summary: { entries: number; workers: number; approvedMinutes: number; provisionalMinutes: number }; entries: Entry[]; trips: unknown[]; fuelRecords: unknown[] };

const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function ReportPanel() {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setError("");
    const response = await fetch(`/api/reports/daily?date=${date}`, { credentials: "include" });
    if (!response.ok) { setError("Denní report se nepodařilo načíst."); setLoading(false); return; }
    setReport((await response.json() as { report: Report }).report); setLoading(false);
  }
  useEffect(() => { void load(); }, [date]);

  return <section className="management-panel report-panel"><div className="section-heading"><div><p className="eyebrow">ŽIVÝ PROVOZNÍ PŘEHLED</p><h3>Denní report</h3></div><div className="report-controls"><input aria-label="Datum reportu" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><a className="download-button" href={`/api/reports/daily.pdf?date=${date}`} download>Stáhnout PDF</a></div></div>{error && <p className="error">{error}</p>}{loading ? <p className="muted">Načítám aktuální data…</p> : report && <><div className="report-summary"><div><strong>{report.summary.workers}</strong><span>pracovníků</span></div><div><strong>{report.summary.entries}</strong><span>úseků</span></div><div><strong>{hours(report.summary.approvedMinutes)}</strong><span>schváleno</span></div><div><strong>{hours(report.summary.provisionalMinutes)}</strong><span>předběžně</span></div></div>{report.entries.length === 0 ? <p className="muted">Pro vybraný den nejsou dostupná data.</p> : <div className="report-table"><div className="report-row report-head"><span>Zakázka</span><span>Pracovník</span><span>Práce</span><span>Čas</span><span>Stav</span></div>{report.entries.map((entry) => <div className="report-row" key={entry.id}><span><strong>{entry.projectCode}</strong><small>{entry.projectName}</small></span><span>{entry.employeeName}</span><span>{entry.workTypeName}{entry.machineCode && <small>Stroj {entry.machineCode}</small>}</span><span>{hours(entry.workedMinutes)}</span><span className={`report-state ${entry.entryState === "APPROVED" ? "approved" : "provisional"}`}>{entry.entryState === "APPROVED" ? "Schváleno" : "Předběžné"}</span></div>)}</div>}</>}</section>;
}
