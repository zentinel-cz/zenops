import { useEffect, useState } from "react";
import type { WorkerProfile } from "@zenops/contracts";
import { ListSearch, matchesSearch } from "./ListSearch";

type ReturnEntry = { id: string; quantity: number; returnedOn: string; note: string | null; recordedBy: string };
type Issue = { id: string; itemName: string; quantity: number; returnedQuantity: number; outstandingQuantity: number; size: string | null; issuedOn: string; location: string | null; note: string | null; returns: ReturnEntry[] };

export function WorkerProfilePanel({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/profile", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profil se nepodařilo načíst.");
        return response.json() as Promise<{ profile: WorkerProfile; issues: Issue[] }>;
      })
      .then((data) => { setProfile(data.profile); setIssues(data.issues); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Profil se nepodařilo načíst."));
  }, []);

  return <section className="management-panel worker-profile-panel">
    <div className="worker-profile-heading"><div><p className="eyebrow">MOJE ÚDAJE</p><h3>Můj profil</h3><p>Vaše kontaktní údaje a přehled věcí převzatých od firmy.</p></div><button type="button" className="worker-back" onClick={onClose}>← Zpět na úvod</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    {!profile && !error && <p className="muted">Načítám profil…</p>}
    {profile && <>
      <dl className="worker-profile-details">
        <div><dt>Jméno</dt><dd>{profile.displayName}</dd></div>
        <div><dt>Osobní číslo</dt><dd>{profile.employeeNumber}</dd></div>
        <div><dt>E-mail</dt><dd>{profile.email}</dd></div>
        <div><dt>Telefon</dt><dd>{profile.phone || "Není uveden"}</dd></div>
        <div><dt>Velikost vrchního oděvu</dt><dd>{profile.upperWorkwearSize || "Není uvedena"}</dd></div>
        <div><dt>Velikost kalhot</dt><dd>{profile.lowerWorkwearSize || "Není uvedena"}</dd></div>
        <div><dt>Velikost obuvi</dt><dd>{profile.shoeSize || "Není uvedena"}</dd></div>
      </dl>
      <div className="worker-profile-history"><div className="section-heading"><div><p className="eyebrow">PŘEVZATÉ VĚCI</p><h3>Moje výdejky</h3></div></div>
        {issues.length === 0 ? <p className="muted">Zatím nemáte evidované vydané věci.</p> : <><ListSearch value={query} onChange={setQuery} label="Hledat v mých výdejkách" /><div className="issued-item-list">{issues.filter((issue) => matchesSearch(query, issue.itemName, issue.size, issue.issuedOn, issue.location, issue.note, issue.quantity, issue.returnedQuantity, issue.returns.map((item) => `${item.returnedOn} ${item.note ?? ""}`).join(" "))).map((issue) => <article key={issue.id}>
          <div className="issued-item-heading"><strong>{issue.itemName}</strong><span>{formatDate(issue.issuedOn)}</span></div>
          <p>Vydáno: {issue.quantity}{issue.size ? ` · Velikost ${issue.size}` : ""} · Místo: {issue.location || "Neuvedeno"} · Vráceno: {issue.returnedQuantity} · Máte u sebe: {issue.outstandingQuantity}</p>
          {issue.note && <small>{issue.note}</small>}
          {issue.returns.length > 0 && <ul>{issue.returns.map((item) => <li key={item.id}>Vráceno {item.quantity} · {formatDate(item.returnedOn)}{item.note ? ` · ${item.note}` : ""}</li>)}</ul>}
        </article>)}{issues.length > 0 && !issues.some((issue) => matchesSearch(query, issue.itemName, issue.size, issue.issuedOn, issue.location, issue.note, issue.quantity, issue.returnedQuantity)) && <p className="muted">Žádná výdejka neodpovídá hledání.</p>}</div></>}
      </div>
    </>}
  </section>;
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("cs-CZ");
}
