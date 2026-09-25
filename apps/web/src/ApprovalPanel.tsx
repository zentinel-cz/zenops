import { useEffect, useState } from "react";

type PendingEntry = { id: string; employeeName: string; workDate: string; startAt: string; endAt: string; projectCode: string; projectName: string; workTypeName: string };

export function ApprovalPanel() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [returning, setReturning] = useState<PendingEntry | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const load = () => fetch("/api/approvals/pending", { credentials: "include" }).then(async (response) => response.ok ? response.json() as Promise<{ entries: PendingEntry[] }> : Promise.reject()).then((body) => setEntries(body.entries));
  useEffect(() => { void load().catch(() => setError("Čekající práce se nepodařilo načíst.")); }, []);

  async function decide(entry: PendingEntry, action: "APPROVED" | "RETURNED") {
    setError("");
    const response = await fetch(`/api/approvals/${entry.id}/decision`, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "APPROVED" ? { action } : { action, reason }),
    });
    if (!response.ok) { const body = await response.json().catch(() => ({ error: "Rozhodnutí se nezdařilo." })) as { error?: string }; setError(body.error ?? "Rozhodnutí se nezdařilo."); return; }
    setReturning(null); setReason(""); await load();
  }

  return <section className="management-panel"><div className="section-heading"><div><p className="eyebrow">KONTROLA PRÁCE</p><h3>Čeká na schválení</h3></div><span className="state-badge">{entries.length}</span></div>{error && <p className="error">{error}</p>}{entries.length === 0 ? <p className="muted">Žádná práce nyní nečeká na vaše rozhodnutí.</p> : <div className="approval-list">{entries.map((entry) => <div key={entry.id}><strong>{entry.employeeName}</strong><span>{entry.projectCode} · {entry.workTypeName}</span><span>{new Date(entry.startAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}–{new Date(entry.endAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span><div><button className="table-action approve" onClick={() => void decide(entry, "APPROVED")}>Schválit</button><button className="table-action" onClick={() => setReturning(entry)}>Vrátit</button></div></div>)}</div>}{returning && <div className="decision-dialog"><strong>Vrátit práci: {returning.employeeName}</strong><label>Důvod<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} autoFocus /></label><div><button disabled={reason.trim().length < 3} onClick={() => void decide(returning, "RETURNED")}>Potvrdit vrácení</button><button className="ghost" onClick={() => setReturning(null)}>Zrušit</button></div></div>}</section>;
}
