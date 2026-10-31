import { businessDate, businessTimeZone } from "@zenops/contracts/time";
import { BusinessDateTimeField, readBusinessDateTime } from "./BusinessDateTimeField";
import { useMutation } from "./useMutation";
import { workActivities, workStateLabel, shiftLabel } from "@zenops/contracts/labels";
import type { MachineUsageSummary, ProjectSummary } from "@zenops/contracts";
import { type FormEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";
import type { CorrectionTrip, OperationalCorrectionTarget } from "./OperationalCorrectionForm";
import type { WorkDayRecordTarget } from "./PeriodBlockers";
const OperationalCorrectionForm = lazy(() => import("./OperationalCorrectionForm").then((module) => ({ default: module.OperationalCorrectionForm })));
type MachineUsage = MachineUsageSummary;

type Entry = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  workTypeCode: string;
  workTypeName: string;
  workActivityCode: string | null;
  startAt: string;
  endAt: string;
  description: string | null;
  state: string;
  machineUsages: MachineUsage[];
};
type Break = { id: string; startAt: string; endAt: string };
type Trip = CorrectionTrip;
type Day = {
  id: string;
  workDate: string;
  shiftType: string;
  state: string;
  employeeId: string;
  displayName: string;
  canCancel?: boolean;
  cancellationReason?: string | null;
  entries: Entry[];
  breaks: Break[];
  vehicleTrips: Trip[];
};
const types = [
  ["MACHINE_MOWING", "Strojní sečení"],
  ["TREE_CUTTING", "Kácení"],
  ["REPROFILING", "Reprofilace"],
  ["BRUSHCUTTER", "Ruční sečení"],
  ["OTHER", "Ostatní"],
];
const activities = workActivities;
export function AdminRecordsPanel({
  projects,
  leaderMode = false,
  initialTarget,
  onBackToMonth,
}: {
  projects: ProjectSummary[];
  leaderMode?: boolean;
  initialTarget?: WorkDayRecordTarget | null;
  onBackToMonth?: () => void;
}) {
  const today = businessDate();
  const [date, setDate] = useState(initialTarget?.workDate.slice(0,10) ?? today);
  const [focusedDayId,setFocusedDayId] = useState(initialTarget?.id ?? "");
  const [days, setDays] = useState<Day[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [target, setTarget] = useState<Entry | null>(null);
  const [breakTarget, setBreakTarget] = useState<Break | null>(null);
  const [cancellingDay, setCancellingDay] = useState<Day | null>(null);
  const [operationalTarget, setOperationalTarget] = useState<OperationalCorrectionTarget | null>(null);
  const [message, setMessage] = useState("");
  const { busy, runMutation } = useMutation(setMessage);
  const [query, setQuery] = useState("");
  const requestVersion = useRef(0);
  const load = () => {
    const version = ++requestVersion.current;
    setLoadState("loading");
    setDays([]);
    return fetch(`/api/${leaderMode ? "leader" : "admin"}/workdays?date=${date}${!leaderMode && focusedDayId ? `&workDayId=${focusedDayId}` : ""}`, { credentials: "include" })
      .then(async (r) =>
        r.ok ? (r.json() as Promise<{ workDays: Day[] }>) : Promise.reject(),
      )
      .then((b) => { if (version === requestVersion.current) { setDays(b.workDays); setLoadState("loaded"); } })
      .catch(() => {
        if (version === requestVersion.current) { setLoadState("error"); setMessage("Záznamy se nepodařilo načíst."); }
      });
  };
  useEffect(() => {
    setTarget(null); setBreakTarget(null); setCancellingDay(null); setOperationalTarget(null); setMessage("");
    void load();
    return () => { requestVersion.current++; };
  }, [date, leaderMode, focusedDayId]);
  useEffect(()=>{
    setDate(initialTarget?.workDate.slice(0,10) ?? businessDate());
    setFocusedDayId(initialTarget?.id ?? "");
  },[initialTarget]);
  async function edit(e: FormEvent<HTMLFormElement>) {
e.preventDefault(); return runMutation(async () => {

    e.preventDefault();
    if (!target) return;
    const d = new FormData(e.currentTarget);
    const r = await fetch(`/api/${leaderMode ? "leader" : "admin"}/work-entries/${target.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: d.get("projectId"),
        workTypeCode: d.get("workTypeCode"),
        workActivityCode: d.get("workActivityCode") || null,
        startAt: readBusinessDateTime(d, "startAt"),
        endAt: readBusinessDateTime(d, "endAt"),
        description: d.get("description") || null,
        reason: d.get("reason"),
      }),
    });
    if (!r.ok) {
      setMessage(((await r.json()) as { error: string }).error);
      return;
    }
    setTarget(null);
    setMessage("Denní záznam byl auditovaně opraven.");
    await load();

});
}
  async function cancelDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runMutation(async () => {
      if (!cancellingDay) return;
      const response = await fetch(`/api/admin/workdays/${cancellingDay.id}/cancel`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: data.get("reason") }),
      });
      if (!response.ok) { setMessage(((await response.json()) as { error: string }).error); return; }
      setCancellingDay(null); setMessage("Prázdný den byl auditovaně zrušen a neblokuje uzávěrku."); await load();
    });
  }
  async function editBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await runMutation(async () => {
      if (!breakTarget) return;
      const response = await fetch(`/api/admin/breaks/${breakTarget.id}`, {
        method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ startAt: readBusinessDateTime(data, "startAt"), endAt: readBusinessDateTime(data, "endAt"), reason: data.get("reason") }),
      });
      if (!response.ok) { setMessage(((await response.json()) as { error: string }).error); return; }
      setBreakTarget(null); setMessage("Přestávka byla auditovaně opravena."); await load();
    });
  }
  function openOperational(target: OperationalCorrectionTarget) {
    setTarget(null); setBreakTarget(null); setCancellingDay(null); setMessage("");
    setOperationalTarget(target);
  }
  return (
    <section className="management-panel">
      {initialTarget && onBackToMonth && <button type="button" className="ghost record-back-month" disabled={busy} onClick={onBackToMonth}>← Zpět na měsíční uzávěrku</button>}
      {focusedDayId && initialTarget && <div className="record-focus-context">
        <strong>Vybraný záznam: {initialTarget.employeeName}</strong>
        <button type="button" className="table-action" disabled={busy} onClick={()=>setFocusedDayId("")}>Zobrazit všechny záznamy dne</button>
      </div>}
      <div className="section-heading">
        <div>
          <p className="eyebrow">{leaderMode ? "OPRAVY SCHVÁLENÉ PRÁCE" : "ADMINISTRATIVNÍ KOREKCE"}</p>
          <h3>Denní záznamy zaměstnanců</h3>
        </div>
        <input
          className="month-input"
          aria-label="Datum denních záznamů"
          type="date"
          disabled={busy}
          value={date}
          onChange={(e) => {setDate(e.target.value);setFocusedDayId("");}}
        />
      </div>
      {message && <p className="form-message">{message}</p>}
      {days.length > 0 && <ListSearch value={query} onChange={setQuery} label="Hledat pracovníka nebo záznam práce" />}
      {loadState === "loading" ? <p className="muted" role="status">Načítám záznamy…</p> : loadState === "error" ? null : days.length === 0 ? (
        <p className="muted">{focusedDayId ? "Vybraný záznam již není dostupný. Obnovte měsíční přehled." : "Pro zvolené datum nejsou záznamy."}</p>
      ) : (
        days.filter((day) => matchesSearch(query, day.displayName, day.workDate, shiftLabel(day.shiftType), workStateLabel(day.state), day.entries.map((entry) => `${entry.projectCode} ${entry.projectName} ${entry.workTypeName} ${entry.machineUsages.map((usage) => usage.machineCode).join(" ")} ${entry.description ?? ""}`).join(" "))).map((day) => (
          <div className="admin-day" key={day.id}>
            <div>
              <strong>{day.displayName}</strong>
              <span className={`state-badge ${day.state.toLowerCase()}`}>
                {workStateLabel(day.state)}
              </span>
              {!leaderMode && day.canCancel && <button type="button" className="table-action" disabled={busy} onClick={() => { setTarget(null); setBreakTarget(null); setCancellingDay(day); }}>Zrušit prázdný den</button>}
            </div>
            {day.cancellationReason && <p>Důvod zrušení: {day.cancellationReason}</p>}
            {day.entries.map((entry) => (
              <div className="admin-entry" key={entry.id}>
                <span>
                  <b>
                    {new Date(entry.startAt).toLocaleTimeString("cs-CZ", {
                      timeZone: businessTimeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –
                    {new Date(entry.endAt).toLocaleTimeString("cs-CZ", {
                      timeZone: businessTimeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </b>
                  <small>
                    {entry.projectCode} · {entry.workTypeName} · {workStateLabel(entry.state)}
                    {entry.machineUsages.length > 0 ? ` · ${entry.machineUsages.map((usage) => usage.machineCode).join(", ")}` : ""}
                  </small>
                </span>
                <div className="row-actions">
                  <button disabled={busy}
                    className="table-action"
                    onClick={() => { setBreakTarget(null); setTarget(entry); }}
                  >
                    Upravit práci
                  </button>
                  {!leaderMode && entry.machineUsages.map((usage) => (
                    <button disabled={busy}
                      className="table-action"
                      key={usage.id}
                      onClick={() => openOperational({ kind: "machine", usage, employeeName: day.displayName, workDate: day.workDate })}
                    >
                      {usage.machineCode} · MTH/palivo
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {day.breaks.map((item) => (
              <div className="admin-entry" key={item.id}>
                <span>
                  <b>
                    {new Date(item.startAt).toLocaleTimeString("cs-CZ", {
                      timeZone: businessTimeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –
                    {new Date(item.endAt).toLocaleTimeString("cs-CZ", {
                      timeZone: businessTimeZone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </b>
                  <small>Přestávka</small>
                </span>
                <button disabled={busy}
                  className="table-action"
                  onClick={() => { setTarget(null); setBreakTarget(item); }}
                >
                  Upravit přestávku
                </button>
              </div>
            ))}
            {day.vehicleTrips.map((item) => (
              <div className="admin-entry" key={item.id}>
                <span>
                  <b>{item.vehicleCode}</b>
                  <small>
                    {item.startOdometerKm}–{item.endOdometerKm} km
                  </small>
                </span>
                <button disabled={busy} className="table-action" onClick={() => openOperational({ kind: "trip", trip: item, driverEmployeeId: day.employeeId, employeeName: day.displayName, workDate: day.workDate })}>
                  Upravit jízdu
                </button>
              </div>
            ))}
          </div>
        ))
      )}
      {days.length > 0 && !days.some((day) => matchesSearch(query, day.displayName, day.workDate, shiftLabel(day.shiftType), workStateLabel(day.state), day.entries.map((entry) => `${entry.projectCode} ${entry.projectName} ${entry.workTypeName} ${entry.machineUsages.map((usage) => usage.machineCode).join(" ")} ${entry.description ?? ""}`).join(" "))) && <p className="muted">Žádný den neodpovídá hledání.</p>}
      {!leaderMode && operationalTarget && <Suspense fallback={<p role="status">Načítám formulář opravy…</p>}><OperationalCorrectionForm
        key={operationalTarget.kind === "machine" ? operationalTarget.usage.id : operationalTarget.trip.id}
        target={operationalTarget} onClose={() => setOperationalTarget(null)}
        onSaved={() => {
          setOperationalTarget(null); setMessage("Provozní údaj byl auditovaně opraven.");
          void load().catch(() => setMessage("Oprava byla uložena, ale seznam se nepodařilo obnovit. Obnovte stránku."));
        }} /></Suspense>}
      {cancellingDay && <form key={cancellingDay.id} className="admin-entry-form" onSubmit={cancelDay}>
        <strong>Zrušit prázdný den: {cancellingDay.displayName}</strong>
        <p>Datum: {cancellingDay.workDate.slice(0, 10)}. Den i důvod zůstanou v historii. Práce, přestávky ani vlastní jízdy nesmějí být zapsané.</p>
        <label>Důvod zrušení<input name="reason" required minLength={3} maxLength={500} disabled={busy} /></label>
        <button disabled={busy}>Potvrdit zrušení</button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setCancellingDay(null)}>Ponechat den</button>
      </form>}
      {breakTarget && <form key={breakTarget.id} className="admin-entry-form" onSubmit={editBreak}>
        <strong>Opravit přestávku</strong>
        <BusinessDateTimeField name="startAt" label="Začátek přestávky" defaultValue={breakTarget.startAt} />
        <BusinessDateTimeField name="endAt" label="Konec přestávky" defaultValue={breakTarget.endAt} />
        <label>Důvod opravy<input name="reason" required minLength={3} maxLength={1000} /></label>
        <button disabled={busy}>Uložit auditovanou opravu</button>
        <button type="button" disabled={busy} onClick={() => setBreakTarget(null)}>Zrušit</button>
      </form>}
      {target && (
        <form key={target.id} className="admin-entry-form" onSubmit={edit}>
          <div>
            <strong>Upravit pracovní úsek</strong>
            <button disabled={busy}
              type="button"
              className="close-button"
              onClick={() => setTarget(null)}
            >
              ×
            </button>
          </div>
          <label>
            Zakázka
            <select name="projectId" defaultValue={target.projectId}>
              {projects.filter((p) => !leaderMode || p.id === target.projectId).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Druh práce
            <select name="workTypeCode" defaultValue={target.workTypeCode}>
              {types.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Aktivita kácení
            <select
              name="workActivityCode"
              defaultValue={target.workActivityCode ?? ""}
            >
              <option value="">Bez aktivity</option>
              {activities.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </label>
          <BusinessDateTimeField name="startAt" label="Od" defaultValue={target.startAt} />
          <BusinessDateTimeField name="endAt" label="Do" defaultValue={target.endAt} />
          <label>
            Popis
            <input name="description" defaultValue={target.description ?? ""} />
          </label>
          <label>
            Důvod opravy
            <input name="reason" minLength={3} required />
          </label>
          <button disabled={busy}>Uložit auditovanou opravu</button>
        </form>
      )}
    </section>
  );
}
