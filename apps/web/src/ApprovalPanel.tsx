import type { MachineUsageSummary } from "@zenops/contracts";
import { businessDate, businessTime, businessTimeZone } from "@zenops/contracts/time";
import { useEffect, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";
import { machineUsageSearchText } from "./MachineUsageDetails";

type PendingEntry = {
  id: string; employeeName: string; workDate: string; startAt: string; endAt: string;
  projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null;
  description: string | null; machineUsages: MachineUsageSummary[];
};

const dateLabel = (date: string) => new Date(date.slice(0, 10) + "T12:00:00Z")
  .toLocaleDateString("cs-CZ", { timeZone: businessTimeZone });
const numberLabel = (value: string | null, unit = "") => value === null ? "Neuvedeno"
  : `${Number(value).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })}${unit}`;
const machineCount = (count: number) => count === 0 ? "bez stroje" : `${count} ${count === 1 ? "stroj" : count < 5 ? "stroje" : "strojů"}`;

function MachineCard({ usage }: { usage: MachineUsageSummary }) {
  return <section className="approval-machine" aria-label={`Stroj ${usage.machineCode}`}>
    <h5>{usage.machineCode} <span>{usage.machineName}</span></h5>
    <dl className="approval-metrics">
      <div><dt>Počáteční MTH</dt><dd>{numberLabel(usage.startMth)}</dd></div>
      <div><dt>Konečný MTH</dt><dd>{numberLabel(usage.endMth)}</dd></div>
      <div><dt>Spotřeba</dt><dd>{numberLabel(usage.fuelConsumed, " l")}</dd></div>
      <div><dt>Tankování</dt><dd>{numberLabel(usage.fuelRefuelled, " l")}</dd></div>
    </dl>
    <p className="approval-attachments"><strong>Příslušenství:</strong> {usage.attachments.length ? usage.attachments.join(", ") : "Bez příslušenství"}</p>
  </section>;
}

export function ApprovalPanel() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [returning, setReturning] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/approvals/pending", { credentials: "include", ...(signal ? { signal } : {}) });
    if (!response.ok) throw new Error();
    const body = await response.json() as { entries: PendingEntry[] };
    if (!signal?.aborted) setEntries(body.entries);
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch(() => { if (!controller.signal.aborted) setError("Čekající práce se nepodařilo načíst."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function decide(entry: PendingEntry, action: "APPROVED" | "RETURNED") {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/approvals/${entry.id}/decision`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "APPROVED" ? { action } : { action, reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Rozhodnutí se nezdařilo."); return;
      }
      setReturning(null); setReason("");
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      await load().catch(() => setError("Rozhodnutí bylo uloženo, ale seznam se nepodařilo obnovit. Obnovte stránku."));
    } catch { setError("Rozhodnutí se nepodařilo potvrdit. Obnovte seznam před dalším pokusem."); }
    finally { setSaving(false); }
  }

  const visible = entries.filter((entry) => matchesSearch(query, entry.employeeName, entry.workDate,
    entry.projectCode, entry.projectName, entry.workTypeName, entry.workActivityName, entry.description,
    machineUsageSearchText(entry.machineUsages), entry.startAt, entry.endAt));

  return <section className="management-panel approval-panel" aria-label="Práce ke schválení">
    <div className="section-heading">
      <div><p className="eyebrow">KONTROLA PRÁCE</p><h3>Čeká na schválení</h3></div>
      {!loading && <span className="state-badge">{entries.length} {entries.length === 1 ? "úsek" : entries.length > 1 && entries.length < 5 ? "úseky" : "úseků"}</span>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="muted" role="status">Načítám čekající práci…</p>
      : entries.length === 0 ? !error && <p className="muted">Žádná práce nyní nečeká na vaše rozhodnutí.</p>
      : <>
        <ListSearch value={query} onChange={(value) => { setQuery(value); setReturning(null); }}
          label="Hledat podle pracovníka, zakázky, práce nebo techniky" />
        {query && <p className="approval-filter-count" role="status">Zobrazeno {visible.length} z {entries.length} úseků</p>}
        <div className="approval-cards">
          {visible.map((entry) => {
            const showIntervalDates = businessDate(entry.startAt) !== businessDate(entry.endAt)
              || businessDate(entry.startAt) !== entry.workDate.slice(0, 10);
            const minutes = Math.round((Date.parse(entry.endAt) - Date.parse(entry.startAt)) / 60_000);
            return <article className="approval-card" key={entry.id} aria-labelledby={`approval-${entry.id}`}>
              <header className="approval-card-heading">
                <h4 id={`approval-${entry.id}`}>{entry.employeeName}</h4>
                <span className="approval-date">{dateLabel(entry.workDate)}</span>
              </header>
              <p className="approval-project"><strong>{entry.projectCode}</strong> · {entry.projectName}</p>
              <p className="approval-work">{entry.workTypeName}{entry.workActivityName && <span> · {entry.workActivityName}</span>}</p>
              <div className="approval-time">
                <span><time dateTime={entry.startAt}>{showIntervalDates && `${dateLabel(businessDate(entry.startAt))} · `}{businessTime(entry.startAt)}</time>
                  {" – "}<time dateTime={entry.endAt}>{showIntervalDates && `${dateLabel(businessDate(entry.endAt))} · `}{businessTime(entry.endAt)}</time></span>
                <strong>{Math.floor(minutes / 60)} h {minutes % 60} min</strong>
              </div>
              <details className="approval-details">
                <summary>Podrobnosti práce <span>· {machineCount(entry.machineUsages.length)}</span></summary>
                <div className="approval-description"><h5>Popis práce</h5><p>{entry.description || "Popis nebyl uveden."}</p></div>
                <h5>Použitá technika</h5>
                {entry.machineUsages.length === 0 ? <p className="approval-no-machine">Bez vykázaného stroje.</p>
                  : <div className="approval-machines">{entry.machineUsages.map((usage) => <MachineCard key={usage.id} usage={usage} />)}</div>}
              </details>
              {returning === entry.id ? <form className="approval-return" onSubmit={(event) => { event.preventDefault(); void decide(entry, "RETURNED"); }}>
                <label htmlFor={`reason-${entry.id}`}>Důvod vrácení práce</label>
                <textarea id={`reason-${entry.id}`} value={reason}
                  onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required autoFocus disabled={saving} />
                <div className="approval-actions"><button disabled={saving || reason.trim().length < 3} type="submit">Potvrdit vrácení</button>
                  <button disabled={saving} type="button" className="ghost" onClick={() => setReturning(null)}>Zrušit</button></div>
              </form> : <div className="approval-actions">
                <button disabled={saving} className="table-action approve" onClick={() => void decide(entry, "APPROVED")}>Schválit</button>
                <button disabled={saving} className="table-action" onClick={() => { setReason(""); setReturning(entry.id); }}>Vrátit</button>
              </div>}
            </article>;
          })}
        </div>
        {visible.length === 0 && <p className="muted">Žádná práce neodpovídá hledání.</p>}
      </>}
  </section>;
}
