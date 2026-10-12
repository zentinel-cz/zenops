import type { ProjectSummary } from "@zenops/contracts";
import { type FormEvent, useEffect, useState } from "react";

type WorkDay = {
  id: string; workDate: string; shiftType: string; state: string;
  entries: Array<{ id: string; startAt: string; endAt: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null; machineUsageId: string | null; machineCode: string | null; machineName: string | null; enteredStartMth: string | null; endMth: string | null }>;
  breaks: Array<{ id: string; startAt: string; endAt: string }>;
  vehicleTrips: Array<{ id: string; startAt: string; endAt: string; startOdometerKm: string; endOdometerKm: string; fuelConsumed: string | null; fuelRefuelled: string | null; vehicleCode: string; vehicleName: string; registrationNumber: string; passengers: Array<{ id: string; displayName: string }> }>;
};
type Machine = { id: string; code: string; name: string; typeName: string; tracksMth: boolean; latestMth: string | null };
type Attachment = { id: string; code: string; name: string; typeName: string; uniquelyTracked: boolean };
type Vehicle = { id: string; code: string; name: string; registrationNumber: string };
type Employee = { id: string; displayName: string };

const workTypes = [
  ["MACHINE_MOWING", "Strojní sečení"], ["TREE_CUTTING", "Kácení"],
  ["REPROFILING", "Reprofilace"], ["BRUSHCUTTER", "Ruční sečení"],
] as const;
const treeActivities = [["SAWYER", "Pilař"], ["TRACTOR_DRIVER", "Řidič traktoru"], ["HANDLING", "Manipulace"], ["CLEANUP", "Úklid"], ["OTHER", "Ostatní"]];

type ExtraForm = "break" | "vehicle" | null;

export function WorkDayPanel({ projects, assetVersion, employeeId, onClose }: { projects: ProjectSummary[]; assetVersion: number; employeeId: string; onClose: () => void }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  const [extraForm, setExtraForm] = useState<ExtraForm>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machineEntryId, setMachineEntryId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const load = async () => {
    const response = await fetch(`/api/workdays/current?date=${today}`, { credentials: "include" });
    if (response.status === 404) { setWorkDay(null); return; }
    if (!response.ok) throw new Error("Pracovní den se nepodařilo načíst.");
    setWorkDay((await response.json() as { workDay: WorkDay }).workDay);
  };
  useEffect(() => { void load().catch(() => setError("Pracovní den se nepodařilo načíst.")); }, []);
  useEffect(() => {
    void fetch("/api/assets", { credentials: "include" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ machines: Machine[]; attachments: Attachment[]; vehicles: Vehicle[]; employees: Employee[] }>; })
      .then((body) => { setMachines(body.machines); setAttachments(body.attachments); setVehicles(body.vehicles); setEmployees(body.employees); })
      .catch(() => setError("Seznam strojů a vozidel se nepodařilo načíst."));
  }, [assetVersion]);

  async function createDay(shiftType: "MORNING" | "NIGHT") {
    await mutate("/api/workdays", "POST", { workDate: today, shiftType });
  }
  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay || !workType) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(`/api/workdays/${workDay.id}/entries`, "POST", {
      projectId: data.get("projectId"), workTypeCode: workType,
      workActivityCode: data.get("workActivityCode") || null, description: data.get("description") || null,
      startAt: new Date(String(data.get("startAt"))).toISOString(), endAt: new Date(String(data.get("endAt"))).toISOString(),
    });
    if (ok) { form.reset(); setWorkType(null); }
  }
  async function addBreak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(`/api/workdays/${workDay.id}/breaks`, "POST", {
      startAt: new Date(String(data.get("startAt"))).toISOString(), endAt: new Date(String(data.get("endAt"))).toISOString(),
    });
    if (ok) { form.reset(); setExtraForm(null); }
  }
  async function addMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay || !machineEntryId) return; const form = event.currentTarget; const data = new FormData(form);
    const numberOrNull = (name: string) => data.get(name) ? Number(data.get(name)) : null;
    const ok = await mutate(`/api/workdays/${workDay.id}/entries/${machineEntryId}/machine`, "POST", {
      machineId: data.get("machineId"), startMth: numberOrNull("startMth"), endMth: numberOrNull("endMth"),
      fuelConsumed: numberOrNull("fuelConsumed"), fuelRefuelled: numberOrNull("fuelRefuelled"), attachmentIds: data.getAll("attachmentIds"),
    });
    if (ok) { setMachineEntryId(null); setSelectedMachineId(""); }
  }
  async function addVehicleTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const numberOrNull = (name: string) => data.get(name) ? Number(data.get(name)) : null;
    const ok = await mutate(`/api/workdays/${workDay.id}/vehicle-trips`, "POST", {
      vehicleId: data.get("vehicleId"), startAt: new Date(String(data.get("startAt"))).toISOString(),
      endAt: new Date(String(data.get("endAt"))).toISOString(), startOdometerKm: Number(data.get("startOdometerKm")),
      endOdometerKm: Number(data.get("endOdometerKm")), fuelConsumed: numberOrNull("fuelConsumed"),
      fuelRefuelled: numberOrNull("fuelRefuelled"), passengerEmployeeIds: data.getAll("passengerEmployeeIds"), note: data.get("note") || null,
    });
    if (ok) { form.reset(); setExtraForm(null); }
  }
  async function mutate(url: string, method: string, body?: unknown) {
    if (saving) return false;
    setSaving(true); setError("");
    try {
      const response = await fetch(url, { method, credentials: "include", ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
      if (!response.ok) { const result = await response.json().catch(() => ({ error: "Operace se nezdařila." })) as { error?: string }; setError(result.error ?? "Operace se nezdařila."); return false; }
      try { await load(); }
      catch { setError("Záznam se uložil, ale seznam se nepodařilo obnovit. Obnovte stránku před dalším zápisem."); }
      return true;
    } catch { setError("Nepodařilo se spojit se serverem. Zkontrolujte připojení a zkuste to znovu."); return false; }
    finally { setSaving(false); }
  }
  const editable = workDay && ["DRAFT", "RETURNED"].includes(workDay.state);
  const openProjects = projects.filter((project) => project.status === "OPEN");
  const timelineItems = workDay ? [
    ...workDay.entries.map((entry) => ({ id: entry.id, startAt: entry.startAt, endAt: entry.endAt, kind: "work", label: `${entry.projectCode} · ${entry.workTypeName}${entry.workActivityName ? ` · ${entry.workActivityName}` : ""}`, detail: entry.machineCode ? `Stroj: ${entry.machineCode} · MTH ${entry.enteredStartMth}–${entry.endMth}` : "", entryId: entry.id, breakId: null as string | null })),
    ...workDay.breaks.map((entry) => ({ id: entry.id, startAt: entry.startAt, endAt: entry.endAt, kind: "break", label: "Přestávka", detail: "", entryId: null as string | null, breakId: entry.id })),
    ...workDay.vehicleTrips.map((trip) => ({ id: trip.id, startAt: trip.startAt, endAt: trip.endAt, kind: "vehicle", label: `Jízda · ${trip.vehicleCode} · ${trip.registrationNumber}`, detail: `${trip.startOdometerKm}–${trip.endOdometerKm} km${trip.passengers.length ? ` · Cestující: ${trip.passengers.map((person) => person.displayName).join(", ")}` : ""}`, entryId: null as string | null, breakId: null as string | null })),
  ].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()) : [];

  return (
    <section className="management-panel workday-panel">
      <div className="worker-panel-heading"><button type="button" className="worker-back" onClick={onClose}>← Zpět na úvod</button><div><p className="eyebrow">DNEŠNÍ ZÁZNAM · {today}</p><h3>Moje směna</h3></div>{workDay && <span className={`state-badge ${workDay.state.toLowerCase()}`}>{stateLabel(workDay.state)}</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {!workDay && <div className="worker-step"><StepNumber value={1} /><div><h4>Jakou máte dnes směnu?</h4><p>Vyberte jednu možnost. Potom přidáte druh práce.</p></div><div className="shift-picker"><button type="button" disabled={saving} onClick={() => void createDay("MORNING")}><span aria-hidden="true">☀</span><strong>{saving ? "Zakládám záznam…" : "Ranní směna"}</strong><small>Začít ranní směnu</small></button><button type="button" disabled={saving} onClick={() => void createDay("NIGHT")}><span aria-hidden="true">☾</span><strong>{saving ? "Zakládám záznam…" : "Noční směna"}</strong><small>Začít noční směnu</small></button></div></div>}
      {workDay && <>
        <div className="worker-records-heading"><h4>Dnešní záznamy</h4><span>{workDay.entries.length} {workDay.entries.length === 1 ? "pracovní úsek" : "pracovních úseků"}</span></div>
        {workDay.entries.length + workDay.breaks.length + workDay.vehicleTrips.length === 0
          ? <p className="worker-empty-state">Zatím tu nic není. Níže přidejte první pracovní úsek.</p>
          : <div className="timeline">{timelineItems.map((item) => <div className={`timeline-item ${item.kind}`} key={`${item.kind}-${item.id}`}><strong>{formatInterval(item.startAt, item.endAt)}</strong><span><b>{item.label}</b>{item.detail && <small>{item.detail}</small>}</span><div className="row-actions">{editable && item.entryId && !workDay.entries.find((entry) => entry.id === item.entryId)?.machineUsageId && machines.length > 0 && <button className="table-action" disabled={saving} onClick={() => setMachineEntryId(item.entryId)}>Přidat stroj</button>}{editable && item.entryId && <button className="table-action" disabled={saving} onClick={() => { if (window.confirm("Opravdu chcete tento pracovní úsek odstranit?")) void mutate(`/api/workdays/${workDay.id}/entries/${item.entryId}`, "DELETE"); }}>Odstranit</button>}{editable && item.breakId && <button className="table-action" disabled={saving} onClick={() => { if (window.confirm("Opravdu chcete tuto přestávku odstranit?")) void mutate(`/api/workdays/${workDay.id}/breaks/${item.breakId}`, "DELETE"); }}>Odstranit</button>}</div></div>)}</div>}
        {editable && machineEntryId && <form className="machine-usage-form" onSubmit={addMachine}><div><h4>Připojit stroj k pracovnímu úseku</h4><button type="button" className="close-button" aria-label="Zavřít formulář" onClick={() => setMachineEntryId(null)}>×</button></div><label>Vyberte stroj<select name="machineId" required value={selectedMachineId} onChange={(event) => setSelectedMachineId(event.target.value)}><option value="">Zvolte stroj</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.code} · {machine.name}</option>)}</select></label>{machines.find((machine) => machine.id === selectedMachineId)?.tracksMth && <><label>Počáteční stav MTH<input name="startMth" type="number" min="0" step="0.01" required placeholder={machines.find((machine) => machine.id === selectedMachineId)?.latestMth ?? ""} /><small>Navržený stav vychází z posledního záznamu.</small></label><label>Konečný stav MTH<input name="endMth" type="number" min="0" step="0.01" required /></label></>}<label>Spotřebované palivo (l)<input name="fuelConsumed" type="number" min="0" step="0.01" /></label><label>Natankované palivo (l)<input name="fuelRefuelled" type="number" min="0" step="0.01" /></label>{attachments.length > 0 && <fieldset><legend>Použité příslušenství</legend>{attachments.map((attachment) => <label className="checkbox" key={attachment.id}><input type="checkbox" name="attachmentIds" value={attachment.id} /> {attachment.code} · {attachment.name}</label>)}</fieldset>}<button disabled={saving}>{saving ? "Ukládám…" : "Uložit údaje o stroji"}</button></form>}
        {editable && !workType && !extraForm && !machineEntryId && <div className="worker-step"><StepNumber value={workDay.entries.length + 2} /><div><h4>Co jste dělal(a)?</h4><p>Vyberte jednu možnost. Další obrazovka se otevře hned potom.</p></div><div className="work-type-picker"><div>{workTypes.map(([code, name]) => <button key={code} onClick={() => setWorkType(code)}><strong>{name}</strong><small>Pokračovat</small></button>)}</div></div></div>}
        {editable && workType && <div className="workday-forms"><form onSubmit={addEntry}><div className="worker-step-heading"><StepNumber value={workDay.entries.length + 2} /><div><p className="eyebrow">NOVÝ PRACOVNÍ ÚSEK</p><h4>{workTypes.find(([code]) => code === workType)?.[1]}</h4></div></div><p className="form-hint">Zadejte zakázku a skutečný čas. Konec musí být později než začátek.</p><label>Na které zakázce jste pracoval(a)?<select name="projectId" required defaultValue=""><option value="" disabled>Zvolte zakázku ze seznamu</option>{openProjects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label>{workType === "TREE_CUTTING" && <label>Jakou činnost jste dělal(a)?<select name="workActivityCode" required defaultValue=""><option value="" disabled>Vyberte činnost</option>{treeActivities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>}<label>Začátek práce<input name="startAt" type="datetime-local" required /></label><label>Konec práce<input name="endAt" type="datetime-local" required /></label><button disabled={saving || openProjects.length === 0}>{saving ? "Ukládám…" : "Uložit pracovní úsek"}</button><button type="button" className="ghost" disabled={saving} onClick={() => setWorkType(null)}>Zrušit a vrátit se</button>{openProjects.length === 0 && <p className="form-hint">Momentálně není dostupná žádná otevřená zakázka. Obraťte se na vedoucího.</p>}</form></div>}
        {editable && !workType && !extraForm && !machineEntryId && <div className="worker-extra-actions"><h4>Ještě něco k zapsání?</h4><p>Vyberte přestávku nebo jízdu, pokud se vás týká.</p><div><button className="secondary" disabled={saving} onClick={() => setExtraForm("break")}>Přidat přestávku</button>{vehicles.length > 0 && <button className="secondary" disabled={saving} onClick={() => setExtraForm("vehicle")}>Zapsat jízdu vozidlem</button>}</div></div>}
        {editable && extraForm === "break" && <div className="workday-forms"><form onSubmit={addBreak}><h4>Přestávka</h4><p className="form-hint">Zadejte skutečný začátek a konec přestávky.</p><label>Začátek přestávky<input name="startAt" type="datetime-local" required /></label><label>Konec přestávky<input name="endAt" type="datetime-local" required /></label><button disabled={saving}>{saving ? "Ukládám…" : "Uložit přestávku"}</button><button type="button" className="ghost" disabled={saving} onClick={() => setExtraForm(null)}>Zrušit</button></form></div>}
        {editable && extraForm === "vehicle" && <div className="workday-forms"><form className="vehicle-trip-form" onSubmit={addVehicleTrip}><h4>Jízda vozidlem — vyplňuje řidič</h4><p className="form-hint">Kilometry a palivo zapisuje pouze řidič vozidla.</p><label>Vyberte vozidlo<select name="vehicleId" required defaultValue=""><option value="" disabled>Zvolte vozidlo</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.registrationNumber}</option>)}</select></label><label>Začátek jízdy<input name="startAt" type="datetime-local" required /></label><label>Konec jízdy<input name="endAt" type="datetime-local" required /></label><label>Stav tachometru před jízdou (km)<input name="startOdometerKm" type="number" min="0" step="0.1" required /></label><label>Stav tachometru po jízdě (km)<input name="endOdometerKm" type="number" min="0" step="0.1" required /></label><label>Spotřebované palivo (l)<input name="fuelConsumed" type="number" min="0" step="0.01" /></label><label>Natankované palivo (l)<input name="fuelRefuelled" type="number" min="0" step="0.01" /></label>{employees.length > 0 && <fieldset className="worker-passengers"><legend>Cestující (nepovinné)</legend>{employees.filter((employee) => employee.id !== employeeId).map((employee) => <label className="checkbox" key={employee.id}><input type="checkbox" name="passengerEmployeeIds" value={employee.id} />{employee.displayName}</label>)}<small>Označte každého zaměstnance, který jel s vámi.</small></fieldset>}<label>Poznámka (nepovinná)<input name="note" maxLength={1000} /></label><button disabled={saving}>{saving ? "Ukládám…" : "Uložit jízdu"}</button><button type="button" className="ghost" disabled={saving} onClick={() => setExtraForm(null)}>Zrušit</button></form></div>}
        {editable && workDay.entries.length > 0 && <div className="submit-day-wrap"><p>Před odesláním zkontrolujte zakázky a časy v dnešních záznamech.</p><button className="submit-day" disabled={saving} onClick={() => { if (window.confirm("Odeslat pracovní den vedoucímu ke schválení? Poté už nepůjde běžně upravovat.")) void mutate(`/api/workdays/${workDay.id}/submit`, "POST"); }}>{saving ? "Odesílám…" : "Zkontrolovat a odeslat pracovní den"}</button></div>}
      </>}
    </section>
  );
}

function StepNumber({ value }: { value: number }) { return <span className="worker-step-number" aria-hidden="true">{value}</span>; }
function stateLabel(state: string) { return ({ DRAFT: "Rozpracováno", SUBMITTED: "Odesláno ke schválení", PARTIALLY_APPROVED: "Částečně schváleno", RETURNED: "Vráceno k opravě", APPROVED: "Schváleno" } as Record<string, string>)[state] ?? state; }
function time(value: string) { return new Date(value).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }); }
function formatInterval(startAt: string, endAt: string) {
  const startDate = new Date(startAt).toLocaleDateString("cs-CZ");
  const endDate = new Date(endAt).toLocaleDateString("cs-CZ");
  return `${time(startAt)}–${time(endAt)}${startDate !== endDate ? " (+1 den)" : ""}`;
}
