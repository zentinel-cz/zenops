import type { ProjectSummary } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

type WorkDay = {
  id: string; workDate: string; shiftType: string; state: string;
  entries: Array<{ id: string; startAt: string; endAt: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null }>;
  breaks: Array<{ id: string; startAt: string; endAt: string }>;
};

const workTypes = [
  ["MACHINE_MOWING", "Strojní sečení"], ["BRUSHCUTTER", "Křovinořez"],
  ["TREE_CUTTING", "Kácení"], ["REPROFILING", "Reprofilace"], ["OTHER", "Ostatní"],
];
const treeActivities = [["SAWYER", "Pilař"], ["TRACTOR_DRIVER", "Řidič traktoru"], ["HANDLING", "Manipulace"], ["CLEANUP", "Úklid"], ["OTHER", "Ostatní"]];

export function WorkDayPanel({ projects }: { projects: ProjectSummary[] }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [workType, setWorkType] = useState("MACHINE_MOWING");
  const [error, setError] = useState("");

  const load = () => fetch(`/api/workdays/current?date=${today}`, { credentials: "include" }).then(async (response) => {
    if (response.status === 404) return setWorkDay(null);
    if (!response.ok) throw new Error();
    setWorkDay((await response.json() as { workDay: WorkDay }).workDay);
  });
  useEffect(() => { void load().catch(() => setError("Pracovní den se nepodařilo načíst.")); }, []);

  async function createDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await mutate("/api/workdays", "POST", { workDate: today, shiftType: data.get("shiftType") });
  }
  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(`/api/workdays/${workDay.id}/entries`, "POST", {
      projectId: data.get("projectId"), workTypeCode: data.get("workTypeCode"),
      workActivityCode: data.get("workActivityCode") || null, description: data.get("description") || null,
      startAt: new Date(String(data.get("startAt"))).toISOString(), endAt: new Date(String(data.get("endAt"))).toISOString(),
    });
    if (ok) form.reset();
  }
  async function addBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(`/api/workdays/${workDay.id}/breaks`, "POST", {
      startAt: new Date(String(data.get("startAt"))).toISOString(), endAt: new Date(String(data.get("endAt"))).toISOString(),
    });
    if (ok) form.reset();
  }
  async function mutate(url: string, method: string, body?: unknown) {
    setError("");
    const response = await fetch(url, {
      method, credentials: "include",
      ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) { const result = await response.json().catch(() => ({ error: "Operace se nezdařila." })) as { error?: string }; setError(result.error ?? "Operace se nezdařila."); return false; }
    await load(); return true;
  }
  const editable = workDay && ["DRAFT", "RETURNED"].includes(workDay.state);
  return (
    <section className="management-panel workday-panel">
      <div className="section-heading"><div><p className="eyebrow">MOJE PRÁCE · {today}</p><h3>Pracovní den</h3></div>{workDay && <span className={`state-badge ${workDay.state.toLowerCase()}`}>{workDay.state}</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {!workDay && <form className="start-day" onSubmit={createDay}><label>Směna<select name="shiftType"><option value="MORNING">Ranní</option><option value="NIGHT">Noční</option></select></label><button>Zahájit pracovní den</button></form>}
      {workDay && <><div className="timeline">{workDay.entries.map((entry) => <div key={entry.id}><strong>{time(entry.startAt)}–{time(entry.endAt)}</strong><span>{entry.projectCode} · {entry.workTypeName}{entry.workActivityName ? ` · ${entry.workActivityName}` : ""}</span>{editable && <button className="table-action" onClick={() => void mutate(`/api/workdays/${workDay.id}/entries/${entry.id}`, "DELETE")}>Odstranit</button>}</div>)}{workDay.breaks.map((entry) => <div className="break" key={entry.id}><strong>{time(entry.startAt)}–{time(entry.endAt)}</strong><span>Přestávka</span>{editable && <button className="table-action" onClick={() => void mutate(`/api/workdays/${workDay.id}/breaks/${entry.id}`, "DELETE")}>Odstranit</button>}</div>)}</div>
      {editable && <div className="workday-forms"><form onSubmit={addEntry}><h4>Přidat práci</h4><label>Projekt<select name="projectId" required defaultValue=""><option value="" disabled>Vyberte projekt</option>{projects.filter((p) => p.status === "OPEN").map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label>Druh práce<select name="workTypeCode" value={workType} onChange={(event) => setWorkType(event.target.value)}>{workTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>{workType === "TREE_CUTTING" && <label>Aktivita<select name="workActivityCode" required>{treeActivities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>}<label>Od<input name="startAt" type="datetime-local" required /></label><label>Do<input name="endAt" type="datetime-local" required /></label>{workType === "OTHER" && <label>Popis<input name="description" required maxLength={2000} /></label>}<button>Uložit práci</button></form><form onSubmit={addBreak}><h4>Přidat přestávku</h4><label>Od<input name="startAt" type="datetime-local" required /></label><label>Do<input name="endAt" type="datetime-local" required /></label><button>Uložit přestávku</button></form></div>}
      {editable && workDay.entries.length > 0 && <button className="submit-day" onClick={() => void mutate(`/api/workdays/${workDay.id}/submit`, "POST")}>Odeslat pracovní den</button>}</>}
    </section>
  );
}

function time(value: string) { return new Date(value).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }); }
