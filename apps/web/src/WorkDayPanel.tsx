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

export function WorkDayPanel({ projects, assetVersion }: { projects: ProjectSummary[]; assetVersion: number }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machineEntryId, setMachineEntryId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const load = () => fetch(`/api/workdays/current?date=${today}`, { credentials: "include" }).then(async (response) => {
    if (response.status === 404) return setWorkDay(null);
    if (!response.ok) throw new Error();
    setWorkDay((await response.json() as { workDay: WorkDay }).workDay);
  });
  useEffect(() => { void load().catch(() => setError("Pracovní den se nepodařilo načíst.")); }, []);
  useEffect(() => {
    void fetch("/api/assets", { credentials: "include" }).then(async (response) => response.json() as Promise<{ machines: Machine[]; attachments: Attachment[]; vehicles: Vehicle[]; employees: Employee[] }>).then((body) => { setMachines(body.machines); setAttachments(body.attachments); setVehicles(body.vehicles); setEmployees(body.employees); }).catch(() => setError("Katalog prostředků se nepodařilo načíst."));
  }, [assetVersion]);

  async function createDay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await mutate("/api/workdays", "POST", { workDate: today, shiftType: data.get("shiftType") });
  }
  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(`/api/workdays/${workDay.id}/entries`, "POST", {
      projectId: data.get("projectId"), workTypeCode: workType,
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
      fuelRefuelled: numberOrNull("fuelRefuelled"), passengerEmployeeIds: data.getAll("passengerEmployeeIds"),
      note: data.get("note") || null,
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
      {workDay && <><div className="timeline">{workDay.entries.map((entry) => <div key={entry.id}><strong>{time(entry.startAt)}–{time(entry.endAt)}</strong><span>{entry.projectCode} · {entry.workTypeName}{entry.workActivityName ? ` · ${entry.workActivityName}` : ""}{entry.machineCode ? <small>Stroj: {entry.machineCode} · MTH {entry.enteredStartMth}–{entry.endMth}</small> : null}</span><div className="row-actions">{editable && !entry.machineUsageId && machines.length > 0 && <button className="table-action" onClick={() => setMachineEntryId(entry.id)}>Přidat stroj</button>}{editable && <button className="table-action" onClick={() => void mutate(`/api/workdays/${workDay.id}/entries/${entry.id}`, "DELETE")}>Odstranit</button>}</div></div>)}{workDay.breaks.map((entry) => <div className="break" key={entry.id}><strong>{time(entry.startAt)}–{time(entry.endAt)}</strong><span>Přestávka</span>{editable && <button className="table-action" onClick={() => void mutate(`/api/workdays/${workDay.id}/breaks/${entry.id}`, "DELETE")}>Odstranit</button>}</div>)}{workDay.vehicleTrips.map((trip) => <div className="vehicle-trip" key={trip.id}><strong>{time(trip.startAt)}–{time(trip.endAt)}</strong><span>Jízda: {trip.vehicleCode} · {trip.registrationNumber}<small>{trip.startOdometerKm}–{trip.endOdometerKm} km{trip.passengers.length ? ` · Cestující: ${trip.passengers.map((person) => person.displayName).join(", ")}` : ""}</small></span></div>)}</div>
      {editable && machineEntryId && <form className="machine-usage-form" onSubmit={addMachine}><div><h4>Připojit stroj</h4><button type="button" className="close-button" onClick={() => setMachineEntryId(null)}>×</button></div><label>Stroj<select name="machineId" required value={selectedMachineId} onChange={(event) => setSelectedMachineId(event.target.value)}><option value="">Vyberte stroj</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.code} · {machine.name}</option>)}</select></label>{machines.find((machine) => machine.id === selectedMachineId)?.tracksMth && <><label>Počáteční MTH<input name="startMth" type="number" min="0" step="0.01" required placeholder={machines.find((machine) => machine.id === selectedMachineId)?.latestMth ?? ""} /></label><label>Konečný MTH<input name="endMth" type="number" min="0" step="0.01" required /></label></>}<label>Spotřeba<input name="fuelConsumed" type="number" min="0" step="0.01" /></label><label>Tankování<input name="fuelRefuelled" type="number" min="0" step="0.01" /></label>{attachments.length > 0 && <fieldset><legend>Příslušenství</legend>{attachments.map((attachment) => <label className="checkbox" key={attachment.id}><input type="checkbox" name="attachmentIds" value={attachment.id} /> {attachment.code} · {attachment.name}</label>)}</fieldset>}<button>Připojit ke práci</button></form>}
      {editable && !workType && <div className="work-type-picker"><p className="eyebrow">VYBERTE DRUH PRÁCE</p><div>{workTypes.map(([code, name]) => <button key={code} onClick={() => setWorkType(code)}><strong>{name}</strong><small>Otevřít denní formulář</small></button>)}</div></div>}
      {editable && workType && <div className="workday-forms"><form onSubmit={addEntry}><div className="form-title"><div><p className="eyebrow">DENNÍ ZÁZNAM</p><h4>{workTypes.find(([code]) => code === workType)?.[1]}</h4></div><button type="button" className="ghost" onClick={() => setWorkType(null)}>Změnit druh</button></div><label>Zakázka<select name="projectId" required defaultValue=""><option value="" disabled>Vyberte zakázku</option>{projects.filter((p) => p.status === "OPEN").map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label>{workType === "TREE_CUTTING" && <label>Aktivita<select name="workActivityCode" required>{treeActivities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>}<label>Od<input name="startAt" type="datetime-local" required /></label><label>Do<input name="endAt" type="datetime-local" required /></label><button>Uložit záznam</button></form><form onSubmit={addBreak}><h4>Přidat přestávku</h4><label>Od<input name="startAt" type="datetime-local" required /></label><label>Do<input name="endAt" type="datetime-local" required /></label><button>Uložit přestávku</button></form>{vehicles.length > 0 && <form className="vehicle-trip-form" onSubmit={addVehicleTrip}><h4>Přidat jízdu vozidlem</h4><label>Vozidlo<select name="vehicleId" required defaultValue=""><option value="" disabled>Vyberte vozidlo</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.code} · {vehicle.registrationNumber}</option>)}</select></label><label>Od<input name="startAt" type="datetime-local" required /></label><label>Do<input name="endAt" type="datetime-local" required /></label><label>Počáteční km<input name="startOdometerKm" type="number" min="0" step="0.1" required /></label><label>Konečné km<input name="endOdometerKm" type="number" min="0" step="0.1" required /></label><label>Spotřeba<input name="fuelConsumed" type="number" min="0" step="0.01" /></label><label>Tankování<input name="fuelRefuelled" type="number" min="0" step="0.01" /></label>{employees.length > 0 && <label>Cestující<select name="passengerEmployeeIds" multiple size={Math.min(5, employees.length)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.displayName}</option>)}</select><small>Pro více osob podržte Ctrl/Cmd.</small></label>}<label>Poznámka<input name="note" maxLength={1000} /></label><button>Uložit jízdu jako řidič</button></form>}</div>}
      {editable && workDay.entries.length > 0 && <button className="submit-day" onClick={() => void mutate(`/api/workdays/${workDay.id}/submit`, "POST")}>Odeslat pracovní den</button>}</>}
    </section>
  );
}

function time(value: string) { return new Date(value).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }); }
