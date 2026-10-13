import { type FormEvent, useEffect, useRef, useState } from "react";
import type { WorkerProfile } from "@zenops/contracts";
import { ListSearch, matchesSearch } from "./ListSearch";

type ItemType = { id: string; name: string; isActive: boolean };
type ReturnEntry = { id: string; quantity: number; returnedOn: string; note: string | null; recordedBy: string };
type Issue = { id: string; itemTypeId: string; itemName: string; quantity: number; returnedQuantity: number; outstandingQuantity: number; size: string | null; issuedOn: string; location: string | null; note: string | null; returns: ReturnEntry[] };
type ManagedProfile = WorkerProfile & { roleCode: string; roleName: string };
type ProfileDetail = { profile: ManagedProfile; issues: Issue[] };

export function AccountantPanel() {
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editIssue, setEditIssue] = useState<Issue | null>(null);
  const [returnIssueId, setReturnIssueId] = useState<string | null>(null);
  const [editReturnId, setEditReturnId] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [issueQuery, setIssueQuery] = useState("");

  async function loadLists() {
    const [profileResponse, typeResponse] = await Promise.all([
      fetch("/api/employee-profiles", { credentials: "include" }),
      fetch("/api/issued-item-types?includeInactive=true", { credentials: "include" }),
    ]);
    if (!profileResponse.ok || !typeResponse.ok) throw new Error("Seznam uživatelů nebo katalog se nepodařilo načíst.");
    const [profileBody, typeBody] = await Promise.all([
      profileResponse.json() as Promise<{ profiles: ManagedProfile[] }>,
      typeResponse.json() as Promise<{ itemTypes: ItemType[] }>,
    ]);
    setProfiles(profileBody.profiles);
    setItemTypes(typeBody.itemTypes);
    setSelectedId((current) => current && profileBody.profiles.some((profile) => profile.id === current) ? current : "");
  }

  async function loadDetail(id: string) {
    const request = ++detailRequest.current;
    if (!id) { setDetail(null); setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/employee-profiles/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Kartu uživatele se nepodařilo načíst.");
      const loaded = await response.json() as ProfileDetail;
      if (request === detailRequest.current) setDetail(loaded);
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }

  useEffect(() => { void loadLists().catch((cause) => setError(cause instanceof Error ? cause.message : "Data se nepodařilo načíst.")); }, []);
  useEffect(() => { setDetail(null); void loadDetail(selectedId).catch((cause) => setError(cause instanceof Error ? cause.message : "Kartu uživatele se nepodařilo načíst.")); }, [selectedId]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return;
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/employee-profiles/${detail.profile.id}`, {
      method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: nullable(data.get("phone")), upperWorkwearSize: nullable(data.get("upperWorkwearSize")), lowerWorkwearSize: nullable(data.get("lowerWorkwearSize")), shoeSize: nullable(data.get("shoeSize")), reason: data.get("reason") }),
    });
    if (!response.ok) { setError(await errorFrom(response, "Profil se nepodařilo uložit.")); return; }
    setMessage("Profil byl uložen a změna zaznamenána."); await loadDetail(detail.profile.id);
  }

  async function createItemType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const response = await fetch("/api/issued-item-types", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: new FormData(form).get("name") }) });
    if (!response.ok) { setError(await errorFrom(response, "Druh věci se nepodařilo vytvořit.")); return; }
    form.reset(); setMessage("Druh věci byl přidán do katalogu."); await loadLists();
  }

  async function editItemType(event: FormEvent<HTMLFormElement>, item: ItemType) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/issued-item-types/${item.id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), active: item.isActive, reason: data.get("reason") }) });
    if (!response.ok) { setError(await errorFrom(response, "Druh věci se nepodařilo upravit.")); return; }
    setMessage("Katalog byl upraven."); await loadLists();
  }

  async function setItemTypeActive(item: ItemType) {
    const reason = window.prompt(item.isActive ? "Proč chcete tento druh věci vyřadit z nabídky?" : "Proč chcete tento druh věci znovu aktivovat?");
    if (!reason || reason.trim().length < 3) return;
    const response = await fetch(`/api/issued-item-types/${item.id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: item.name, active: !item.isActive, reason }) });
    if (!response.ok) { setError(await errorFrom(response, "Stav katalogové položky se nepodařilo změnit.")); return; }
    setMessage("Stav katalogové položky byl změněn."); await loadLists();
  }

  async function createIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return; const form = event.currentTarget; const data = new FormData(form);
    const response = await fetch(`/api/employee-profiles/${detail.profile.id}/issues`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemTypeId: data.get("itemTypeId"), quantity: Number(data.get("quantity")), size: nullable(data.get("size")), issuedOn: data.get("issuedOn"), location: data.get("location"), note: nullable(data.get("note")) }) });
    if (!response.ok) { setError(await errorFrom(response, "Vydání se nepodařilo uložit.")); return; }
    setMessage("Vydání bylo zaznamenáno."); form.reset(); await loadDetail(detail.profile.id);
  }

  async function correctIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail || !editIssue) return; const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/employee-item-issues/${editIssue.id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemTypeId: data.get("itemTypeId"), quantity: Number(data.get("quantity")), size: nullable(data.get("size")), issuedOn: data.get("issuedOn"), location: data.get("location"), note: nullable(data.get("note")), reason: data.get("reason") }) });
    if (!response.ok) { setError(await errorFrom(response, "Opravu vydání se nepodařilo uložit.")); return; }
    setEditIssue(null); setMessage("Vydání bylo opraveno a změna zaznamenána."); await loadDetail(detail.profile.id);
  }

  async function addReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail || !returnIssueId) return; const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/employee-item-issues/${returnIssueId}/returns`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: Number(data.get("quantity")), returnedOn: data.get("returnedOn"), note: nullable(data.get("note")) }) });
    if (!response.ok) { setError(await errorFrom(response, "Vrácení se nepodařilo zaznamenat.")); return; }
    setReturnIssueId(null); setMessage("Vrácení bylo zaznamenáno."); await loadDetail(detail.profile.id);
  }

  async function correctReturnDate(event: FormEvent<HTMLFormElement>, returnEntry: ReturnEntry) {
    event.preventDefault(); if (!detail) return; const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/employee-item-returns/${returnEntry.id}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ returnedOn: data.get("returnedOn"), reason: data.get("reason") }) });
    if (!response.ok) { setError(await errorFrom(response, "Datum vrácení se nepodařilo opravit.")); return; }
    setEditReturnId(null); setMessage("Datum vrácení bylo opraveno a změna zaznamenána."); await loadDetail(detail.profile.id);
  }

  const catalog = <section className="accountant-card issued-catalog"><div className="section-heading"><div><p className="eyebrow">KATALOG</p><h3>Vydávané věci</h3></div></div>
    <form className="catalog-create-form" onSubmit={(event) => void createItemType(event)}><label>Nový druh věci<input name="name" minLength={2} maxLength={120} placeholder="Například montérky" required /></label><button>Přidat do katalogu</button></form>
    {itemTypes.length === 0 && <p className="muted">Katalog je prázdný. Přidejte nejprve věc, například montérky nebo obuv.</p>}
    {itemTypes.length > 0 && <ListSearch value={catalogQuery} onChange={setCatalogQuery} label="Hledat druh věci v katalogu" />}
    <div className="issued-catalog-list">{itemTypes.filter((item) => matchesSearch(catalogQuery, item.name, item.isActive ? "aktivní" : "vyřazený")).map((item) => <div className={!item.isActive ? "inactive" : ""} key={item.id}>
      <form onSubmit={(event) => void editItemType(event, item)}><input aria-label={`Název: ${item.name}`} name="name" defaultValue={item.name} minLength={2} maxLength={120} required /><label>Důvod změny<input name="reason" minLength={3} maxLength={500} placeholder="Důvod pro audit" required /></label><button>Uložit</button></form>
      <button type="button" className="table-action" onClick={() => void setItemTypeActive(item)}>{item.isActive ? "Vyřadit" : "Aktivovat"}</button>
    </div>)}{itemTypes.length > 0 && !itemTypes.some((item) => matchesSearch(catalogQuery, item.name, item.isActive ? "aktivní" : "vyřazený")) && <p className="muted">Žádný druh věci neodpovídá hledání.</p>}</div>
  </section>;

  return <section className="accountant-workspace">
    <div className="section-heading"><div><p className="eyebrow">PERSONÁLNÍ EVIDENCE</p><h2>Uživatelé a svěřené věci</h2></div></div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="form-message" role="status">{message}</p>}
    {selectedId ? <div className="accountant-detail-view">
      <button type="button" className="accountant-back" onClick={() => { setSelectedId(""); setDetail(null); setEditIssue(null); setReturnIssueId(null); setEditReturnId(null); setMessage(""); setError(""); }}>← Zpět na seznam uživatelů</button>
      {detailLoading && <section className="accountant-card"><p className="muted">Načítám kartu uživatele…</p></section>}
      {detail?.profile.id === selectedId && <div className="accountant-main">
        <section className="accountant-card"><div className="section-heading"><div><p className="eyebrow">PROFIL UŽIVATELE · {detail.profile.roleName}</p><h3>{detail.profile.displayName}</h3></div><span className="state-badge">{detail.profile.isActive ? "Aktivní" : "Neaktivní"}</span></div>
          <dl className="worker-profile-details"><div><dt>Osobní číslo</dt><dd>{detail.profile.employeeNumber}</dd></div><div><dt>E-mail</dt><dd>{detail.profile.email}</dd></div></dl>
          {detail.profile.roleCode === "WORKER" && <form className="profile-edit-form" onSubmit={(event) => void submitProfile(event)}>
            <label>Telefon<input name="phone" type="tel" maxLength={40} defaultValue={detail.profile.phone ?? ""} /></label>
            <label>Velikost vrchního oděvu<input name="upperWorkwearSize" maxLength={40} defaultValue={detail.profile.upperWorkwearSize ?? ""} /></label>
            <label>Velikost kalhot<input name="lowerWorkwearSize" maxLength={40} defaultValue={detail.profile.lowerWorkwearSize ?? ""} /></label>
            <label>Velikost obuvi<input name="shoeSize" maxLength={40} defaultValue={detail.profile.shoeSize ?? ""} /></label>
            <label className="profile-edit-reason">Důvod změny<input name="reason" required minLength={3} maxLength={500} /></label>
            <button>Uložit profil</button>
          </form>}
        </section>
        <section className="accountant-card"><div className="section-heading"><div><p className="eyebrow">NAFASOVANÉ VĚCI</p><h3>Výdej a vrácení</h3></div></div>
          {detail.issues.length > 0 && <ListSearch value={issueQuery} onChange={setIssueQuery} label="Hledat ve výdejkách tohoto uživatele" />}
          {detail.issues.length === 0 ? <p className="muted">Tento uživatel zatím nemá žádné výdejky. Vyberte věc v katalogu a zapište výdej ve formuláři níže.</p> : <div className="issued-item-list">{detail.issues.filter((issue) => matchesSearch(issueQuery, issue.itemName, issue.size, issue.issuedOn, issue.location, issue.note, issue.quantity, issue.returnedQuantity, issue.returns.map((item) => `${item.returnedOn} ${item.note ?? ""}`).join(" "))).map((issue) => <article key={issue.id}>
            <div className="issued-item-heading"><strong>{issue.itemName}</strong><span>{formatDate(issue.issuedOn)}</span></div>
            <p>Vydáno {issue.quantity}{issue.size ? ` · Velikost ${issue.size}` : ""} · Místo: {issue.location || "Neuvedeno"} · Vráceno {issue.returnedQuantity} · U uživatele {issue.outstandingQuantity}</p>
            {issue.note && <small>{issue.note}</small>}
            <div className="issued-item-actions"><button type="button" className="table-action" onClick={() => setEditIssue(issue)}>Opravit vydání</button>{issue.outstandingQuantity > 0 && <button type="button" className="table-action" onClick={() => setReturnIssueId(returnIssueId === issue.id ? null : issue.id)}>Zapsat vrácení</button>}</div>
            {issue.returns.length > 0 && <ul>{issue.returns.map((item) => <li key={item.id}>Vráceno {item.quantity} · {formatDate(item.returnedOn)}{item.note ? ` · ${item.note}` : ""} · {item.recordedBy} <button type="button" className="table-action" onClick={() => setEditReturnId(editReturnId === item.id ? null : item.id)}>Opravit datum</button>{editReturnId === item.id && <ReturnDateForm entry={item} onSubmit={(event) => void correctReturnDate(event, item)} onCancel={() => setEditReturnId(null)} />}</li>)}</ul>}
            {editIssue?.id === issue.id && <IssueForm key={`edit-${issue.id}`} itemTypes={itemTypes} issue={issue} onSubmit={(event) => void correctIssue(event)} onCancel={() => setEditIssue(null)} />}
            {returnIssueId === issue.id && <ReturnForm key={`return-${issue.id}`} maxQuantity={issue.outstandingQuantity} onSubmit={(event) => void addReturn(event)} onCancel={() => setReturnIssueId(null)} />}
          </article>)}{detail.issues.length > 0 && !detail.issues.some((issue) => matchesSearch(issueQuery, issue.itemName, issue.size, issue.issuedOn, issue.location, issue.note, issue.quantity, issue.returnedQuantity, issue.returns.map((item) => `${item.returnedOn} ${item.note ?? ""}`).join(" "))) && <p className="muted">Žádná výdejka neodpovídá hledání.</p>}</div>}
          {detail.profile.isActive && <form className="issue-create-form" onSubmit={(event) => void createIssue(event)}><h4>Zaznamenat výdej uživateli</h4>
            <label>Druh věci<select name="itemTypeId" required defaultValue=""><option value="" disabled>Vyberte z katalogu</option>{itemTypes.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Množství<input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></label>
            <label>Velikost (nepovinné)<input name="size" maxLength={40} /></label>
            <label>Datum vydání<input name="issuedOn" type="date" defaultValue={today()} required /></label>
            <label>Místo výdeje<input name="location" minLength={2} maxLength={160} placeholder="Např. sklad nebo pracoviště" required /></label>
            <label>Poznámka (nepovinná)<input name="note" maxLength={1000} /></label>
            <button disabled={itemTypes.every((item) => !item.isActive)}>Zaznamenat vydání</button>
          </form>}
        </section>
      </div>}
    </div> : <div className="accountant-directory-view">
      <section className="accountant-card accountant-user-directory"><div className="section-heading"><div><p className="eyebrow">SPRÁVA VYBAVENÍ</p><h3>Vyberte uživatele</h3></div><span className="state-badge">{profiles.length} uživatelů</span></div>
        {profiles.length > 0 && <ListSearch value={userQuery} onChange={setUserQuery} label="Hledat uživatele podle jména, osobního čísla, role nebo stavu" />}
        {profiles.length === 0 ? <p className="muted">Zatím tu nejsou uživatelské účty. Účty a jejich profily vytváří Admin v části Zaměstnanci.</p> : <div className="accountant-user-list">{profiles.filter((profile) => matchesSearch(userQuery, profile.displayName, profile.employeeNumber, profile.roleName, profile.email, profile.phone, profile.isActive ? "aktivní" : "neaktivní")).map((profile) => <button type="button" className="accountant-user-card" key={profile.id} onClick={() => { setSelectedId(profile.id); setDetail(null); setEditIssue(null); setReturnIssueId(null); setEditReturnId(null); setError(""); setMessage(""); }}>
          <span className="accountant-user-avatar" aria-hidden="true">{profile.displayName.trim().slice(0, 1).toLocaleUpperCase("cs-CZ")}</span><span className="accountant-user-copy"><strong>{profile.displayName}</strong><small>{profile.roleName} · osobní číslo {profile.employeeNumber}</small></span><span className={profile.isActive ? "accountant-user-state" : "accountant-user-state inactive"}>{profile.isActive ? "Aktivní" : "Neaktivní"}</span><span className="accountant-user-chevron" aria-hidden="true">›</span>
        </button>)}{profiles.length > 0 && !profiles.some((profile) => matchesSearch(userQuery, profile.displayName, profile.employeeNumber, profile.roleName, profile.email, profile.phone, profile.isActive ? "aktivní" : "neaktivní")) && <p className="muted">Žádný uživatel neodpovídá hledání.</p>}</div>}
      </section>
      {catalog}
    </div>}
  </section>;
}

function IssueForm({ itemTypes, issue, onSubmit, onCancel }: { itemTypes: ItemType[]; issue: Issue; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="inline-record-form" onSubmit={onSubmit}><h4>Opravit vydání</h4><label>Druh věci<select name="itemTypeId" defaultValue={issue.itemTypeId} required>{itemTypes.filter((item) => item.isActive || item.id === issue.itemTypeId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Množství<input name="quantity" type="number" min={issue.returnedQuantity || 1} step="1" defaultValue={issue.quantity} required /></label><label>Velikost<input name="size" maxLength={40} defaultValue={issue.size ?? ""} /></label><label>Datum vydání<input name="issuedOn" type="date" defaultValue={issue.issuedOn.slice(0, 10)} required /></label><label>Místo výdeje<input name="location" minLength={2} maxLength={160} defaultValue={issue.location ?? ""} required /></label><label>Poznámka<input name="note" maxLength={1000} defaultValue={issue.note ?? ""} /></label><label>Důvod opravy<input name="reason" minLength={3} maxLength={500} required /></label><button>Uložit opravu</button><button type="button" className="ghost" onClick={onCancel}>Zrušit</button></form>;
}

function ReturnForm({ maxQuantity, onSubmit, onCancel }: { maxQuantity: number; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="inline-record-form" onSubmit={onSubmit}><h4>Zapsat vrácení</h4><label>Vrácené množství<input name="quantity" type="number" min="1" max={maxQuantity} step="1" defaultValue={maxQuantity} required /></label><label>Datum vrácení<input name="returnedOn" type="date" defaultValue={today()} required /></label><label>Poznámka (nepovinná)<input name="note" maxLength={1000} /></label><button>Zaznamenat vrácení</button><button type="button" className="ghost" onClick={onCancel}>Zrušit</button></form>;
}

function ReturnDateForm({ entry, onSubmit, onCancel }: { entry: ReturnEntry; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="inline-record-form" onSubmit={onSubmit}><h4>Opravit datum vrácení</h4><label>Datum vrácení<input name="returnedOn" type="date" defaultValue={entry.returnedOn.slice(0, 10)} required /></label><label>Důvod opravy<input name="reason" minLength={3} maxLength={500} required /></label><button>Uložit datum</button><button type="button" className="ghost" onClick={onCancel}>Zrušit</button></form>;
}

function nullable(value: FormDataEntryValue | null) { const result = String(value ?? "").trim(); return result || null; }
async function errorFrom(response: Response, fallback: string) { const body = await response.json().catch(() => ({ error: fallback })) as { error?: string }; return body.error ?? fallback; }
function today() { return new Date().toLocaleDateString("en-CA"); }
function formatDate(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("cs-CZ"); }
