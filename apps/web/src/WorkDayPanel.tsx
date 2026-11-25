import { WorkerMthCorrectionForm } from "./WorkerMthCorrectionForm";
import { VehicleTripForm } from "./VehicleTripForm";
import { MachineUsageDetails, machineUsageSearchText } from "./MachineUsageDetails";
import { businessDate, businessTime, businessDateTimeInput, shiftDateTimeDefaults } from "@zenops/contracts/time";
import { BusinessDateTimeField, readBusinessDateTime } from "./BusinessDateTimeField";
import { workActivities, historicalWorkActivities, workStateLabel, shiftLabel } from "@zenops/contracts/labels";
import type { MachineUsageSummary, ProjectSummary, ShiftPreset } from "@zenops/contracts";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ListSearch, matchesSearch } from "./ListSearch";

type WorkDay = {
  id: string; workDate: string; shiftType: string; state: string; periodState: string;
  canCancel: boolean; cancelledAt: string | null; cancellationReason: string | null;
  entries: Array<{ id: string; projectId: string; workTypeCode: string; workActivityCode: string | null; description: string | null; state: string; returnReason: string | null; hasApprovalHistory: boolean; startAt: string; endAt: string; projectCode: string; projectName: string; workTypeName: string; workActivityName: string | null; machineUsages: MachineUsageSummary[] }>;
  breaks: Array<{ id: string; startAt: string; endAt: string }>;
  vehicleTrips: Array<{ driverEmployeeId: string; driverName: string; participantRole: "DRIVER" | "PASSENGER"; id: string; startAt: string; endAt: string; startOdometerKm: string; endOdometerKm: string; fuelConsumed: string | null; fuelRefuelled: string | null; vehicleCode: string; vehicleName: string; registrationNumber: string; passengers: Array<{ id: string; displayName: string }> }>;
};
type Machine = { id: string; code: string; name: string; typeName: string; tracksMth: boolean; latestMth: string | null };
type Attachment = { id: string; code: string; name: string; typeName: string; uniquelyTracked: boolean };
type Vehicle = { id: string; code: string; name: string; registrationNumber: string };
type Employee = { id: string; displayName: string };

const workTypes = [
  ["MACHINE_MOWING", "Strojní sečení"], ["TREE_CUTTING", "Kácení"],
  ["REPROFILING", "Reprofilace"], ["BRUSHCUTTER", "Ruční sečení"],
  ["OTHER", "Ostatní"],
] as const;
const treeActivities = workActivities;

type ExtraForm = "vehicle" | null;

export function WorkDayPanel({ projects, assetVersion, employeeId, onClose }: { projects: ProjectSummary[]; assetVersion: number; employeeId: string; onClose: () => void }) {
  const [today, setDate] = useState(businessDate());
  const [editingEntry, setEditingEntry] = useState<WorkDay["entries"][number] | null>(null);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [workType, setWorkType] = useState<string | null>(null);
  const [extraForm, setExtraForm] = useState<ExtraForm>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mthTarget, setMthTarget] = useState<{entryId:string;usage:MachineUsageSummary} | null>(null);
  const [machineEntryId, setMachineEntryId] = useState<string | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [timelineQuery, setTimelineQuery] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [presets, setPresets] = useState<ShiftPreset[] | null>(null);
  const [presetError, setPresetError] = useState("");
  async function loadPresets() {
    setPresetError("");
    try {
      const response = await fetch("/api/settings/shift-presets", {credentials:"include"});
      if (!response.ok) throw new Error();
      setPresets((await response.json()).settings.presets);
    } catch { setPresetError("Předvolby směn se nepodařilo načíst."); }
  }
  useEffect(() => { void loadPresets(); }, []);

  const load = async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/workdays/current?date=${today}`, { credentials: "include" });
      if (version !== requestVersion.current) return;
      if (response.status === 404) { setWorkDay(null); return; }
      if (!response.ok) throw new Error("Pracovní den se nepodařilo načíst.");
      const body = await response.json() as { workDay: WorkDay };
      if (version === requestVersion.current) setWorkDay(body.workDay);
    } finally { if (version === requestVersion.current) setLoading(false); }
  };
  useEffect(() => {
    setWorkDay(null); setWorkType(null); setExtraForm(null); setEditingEntry(null); setMachineEntryId(null); setMthTarget(null); setShowCancelForm(false); setError("");
    void load().catch(() => setError("Pracovní den se nepodařilo načíst. Zvolte datum znovu."));
    return () => { requestVersion.current++; };
  }, [today]);
  useEffect(() => {
    void fetch("/api/assets", { credentials: "include" })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ machines: Machine[]; attachments: Attachment[]; vehicles: Vehicle[]; employees: Employee[] }>; })
      .then((body) => { setMachines(body.machines); setAttachments(body.attachments); setVehicles(body.vehicles); setEmployees(body.employees); })
      .catch(() => setError("Seznam strojů a vozidel se nepodařilo načíst."));
  }, [assetVersion]);

  async function createDay(shiftType: "MORNING" | "NIGHT") {
    await mutate("/api/workdays", "POST", { workDate: today, shiftType });
  }
  async function changeDayState(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workDay) return;
    const data = new FormData(event.currentTarget);
    const restoring = workDay.state === "CANCELLED";
    const ok = await mutate(`/api/workdays/${workDay.id}/${restoring ? "restore" : "cancel"}`, "POST", {
      reason: data.get("reason"), ...(restoring ? { shiftType: data.get("shiftType") } : {}),
    });
    if (ok) { setShowCancelForm(false); setWorkType(null); setExtraForm(null); }
  }
  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay || !workType) return; const form = event.currentTarget; const data = new FormData(form);
    const ok = await mutate(editingEntry ? `/api/workdays/${workDay.id}/entries/${editingEntry.id}` : `/api/workdays/${workDay.id}/entries`, editingEntry ? "PATCH" : "POST", () => ({
      projectId: data.get("projectId"), workTypeCode: workType,
      workActivityCode: data.get("workActivityCode") || null, description: data.get("description") || null,
      startAt: readBusinessDateTime(data, "startAt"), endAt: readBusinessDateTime(data, "endAt"),
    }));
    if (ok) { form.reset(); setWorkType(null); setEditingEntry(null); }
  }
  async function addMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay || !machineEntryId) return; const form = event.currentTarget; const data = new FormData(form);
    const numberOrNull = (name: string) => data.get(name) ? Number(data.get(name)) : null;
    const ok = await mutate(`/api/workdays/${workDay.id}/entries/${machineEntryId}/machine`, "POST", {
      machineId: data.get("machineId"), startMth: numberOrNull("startMth"), endMth: numberOrNull("endMth"),
      fuelConsumed: numberOrNull("fuelConsumed"), fuelRefuelled: numberOrNull("fuelRefuelled"), attachmentIds: data.getAll("attachmentIds"), note: data.get("note") || null,
    });
    if (ok) { setMachineEntryId(null); setSelectedMachineId(""); }
  }
  async function addVehicleTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return; const form = event.currentTarget; const data = new FormData(form);
    const numberOrNull = (name: string) => data.get(name) ? Number(data.get(name)) : null;
    const ok = await mutate(`/api/workdays/${workDay.id}/vehicle-trips`, "POST", () => ({
      vehicleId: data.get("vehicleId"), startAt: readBusinessDateTime(data, "startAt"),
      endAt: readBusinessDateTime(data, "endAt"), startOdometerKm: Number(data.get("startOdometerKm")),
      endOdometerKm: Number(data.get("endOdometerKm")), fuelConsumed: numberOrNull("fuelConsumed"),
      fuelRefuelled: numberOrNull("fuelRefuelled"), passengerEmployeeIds: data.getAll("passengerEmployeeIds"), note: data.get("note") || null,
    }));
    if (ok) { form.reset(); setExtraForm(null); }
  }
  async function joinVehicleTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workDay) return;
    const data = new FormData(event.currentTarget);
    const tripId = String(data.get("tripId") ?? "");
    if (!tripId) return;
    const ok = await mutate(`/api/workdays/${workDay.id}/vehicle-trips/${tripId}/passenger`, "POST", {});
    if (ok) setExtraForm(null);
  }
  async function mutate(url: string, method: string, body?: unknown | (() => unknown)) {
    if (saving) return false;
    setSaving(true); setError("");
    try {
      const response = await fetch(url, { method, credentials: "include", ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(typeof body === "function" ? body() : body) } : {}) });
      if (!response.ok) { const result = await response.json().catch(() => ({ error: "Operace se nezdařila." })) as { error?: string }; setError(result.error ?? "Operace se nezdařila."); return false; }
      try { await load(); }
      catch { setError("Záznam se uložil, ale seznam se nepodařilo obnovit. Obnovte stránku před dalším zápisem."); }
      return true;
    } catch (error) { setError(error instanceof RangeError ? error.message : "Nepodařilo se spojit se serverem. Zkontrolujte připojení a zkuste to znovu."); return false; }
    finally { setSaving(false); }
  }
  const defaultTimes = shiftDateTimeDefaults(today, presets?.find(preset => preset.shiftType === workDay?.shiftType));
  const defaultStart = workDay?.entries.length
    ? businessDateTimeInput(workDay.entries.reduce((last,entry) => Date.parse(entry.endAt)>Date.parse(last.endAt) ? entry : last).endAt)
    : defaultTimes.start;
  const workedMinutes = workDay?.entries.reduce((sum, entry) => sum + (Date.parse(entry.endAt) - Date.parse(entry.startAt)) / 60000, 0) ?? 0;
  const approvedMinutes = workDay?.entries.filter(entry => entry.state === "APPROVED").reduce((sum, entry) => sum + (Date.parse(entry.endAt) - Date.parse(entry.startAt)) / 60000, 0) ?? 0;
  const editable = workDay && !loading && workDay.periodState !== "CLOSED" && ["DRAFT", "RETURNED"].includes(workDay.state);
  const openProjects = projects.filter((project) => project.status === "OPEN");
  const machineEntry = workDay?.entries.find((entry) => entry.id === machineEntryId);
  const availableMachines = machines.filter((machine) => !machineEntry?.machineUsages.some((usage) => usage.machineId === machine.id));
  function canAddMachine(entryId: string) {
    const entry = workDay?.entries.find((entry) => entry.id === entryId);
    return !!entry && machines.some((machine) => !entry.machineUsages.some((usage) => usage.machineId === machine.id));
  }
  const timelineItems = workDay ? [
    ...workDay.entries.map((entry) => ({ id: entry.id, startAt: entry.startAt, endAt: entry.endAt, kind: "work", label: `${entry.projectCode} · ${entry.workTypeName}${entry.workActivityName ? ` · ${entry.workActivityName}` : ""}`, detail: machineUsageSearchText(entry.machineUsages), entryId: entry.id, breakId: null as string | null })),
    ...workDay.breaks.map((entry) => ({ id: entry.id, startAt: entry.startAt, endAt: entry.endAt, kind: "break", label: "Historická přestávka", detail: "", entryId: null as string | null, breakId: entry.id })),
    ...workDay.vehicleTrips.map((trip) => ({ id: trip.id, startAt: trip.startAt, endAt: trip.endAt, kind: "vehicle", label: `Jízda · ${trip.vehicleCode} · ${trip.registrationNumber} · ${trip.participantRole === "DRIVER" ? "Řidič" : "Cestující"}`, detail: `Řidič: ${trip.driverName} · ${trip.startOdometerKm}–${trip.endOdometerKm} km${trip.passengers.length ? ` · Cestující: ${trip.passengers.map((person) => person.displayName).join(", ")}` : ""}`, entryId: null as string | null, breakId: null as string | null })),
  ].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()) : [];

  return (
    <section className="management-panel workday-panel">
      <div className="worker-panel-heading"><button type="button" className="worker-back" onClick={onClose}>← Zpět na úvod</button><div><p className="eyebrow">PRACOVNÍ DEN · {today}</p><h3>Moje směna</h3></div>{workDay && <span className={`state-badge ${workDay.state.toLowerCase()}`}>{workStateLabel(workDay.state)}</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      <label>Datum pracovního dne<input type="date" value={today} disabled={saving} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
      {loading && <p role="status">Načítám pracovní den…</p>}
      {presetError && <div role="alert"><p className="error">{presetError}</p><button type="button" className="ghost" onClick={()=>void loadPresets()}>Načíst předvolby znovu</button></div>}
      {!presets && !presetError && <p role="status">Načítám předvolby směn…</p>}
      {!workDay && !loading && !error && presets && <div className="worker-step"><StepNumber value={1} /><div><h4>Jakou máte dnes směnu?</h4><p>Vyberte směnu. Předvolené časy můžete při zápisu práce upravit.</p></div><div className="shift-picker">{presets.map(preset => <button type="button" key={preset.shiftType} disabled={saving} onClick={()=>void createDay(preset.shiftType)}><span aria-hidden="true">{preset.shiftType === "MORNING" ? "☀" : "☾"}</span><strong>{saving ? "Zakládám záznam…" : shiftLabel(preset.shiftType)}</strong><small>{preset.startTime && preset.endTime ? `${preset.startTime}–${preset.endTime}${preset.endTime < preset.startTime ? " (+1 den)" : ""}` : "Časy podle skutečnosti"}</small></button>)}</div></div>}
      {workDay && <>
        {workDay.state === "CANCELLED" && <div className="worker-empty-state" role="status">
          <strong>Pracovní den byl zrušen.</strong><p>Neblokuje měsíční uzávěrku. Důvod: {workDay.cancellationReason}</p>
          {workDay.periodState === "CLOSED" && <p>Obnovení je možné až po znovuotevření měsíce Adminem.</p>}
        </div>}
        {workDay.state === "CANCELLED" && workDay.periodState === "OPEN" && !loading && <div className="workday-forms">
          <form key="restore" onSubmit={changeDayState}><h4>Obnovit pracovní den</h4>
            <p>Obnovíte stejný den i jeho historii. Potom můžete zapsat práci.</p>
            <label>Směna<select name="shiftType" defaultValue={["MORNING","NIGHT"].includes(workDay.shiftType) ? workDay.shiftType : ""} required disabled={saving}><option value="" disabled>Vyberte směnu</option><option value="MORNING">Ranní směna</option><option value="NIGHT">Noční směna</option></select></label>
            <label>Důvod obnovení<input name="reason" required minLength={3} maxLength={500} disabled={saving} /></label>
            <button disabled={saving}>{saving ? "Obnovuji…" : "Obnovit pracovní den"}</button>
          </form>
        </div>}
        {editable && workDay.canCancel && !showCancelForm && <button type="button" className="ghost" disabled={saving} onClick={() => { setShowCancelForm(true); setWorkType(null); setExtraForm(null); }}>Zrušit prázdný den</button>}
        {editable && workDay.canCancel && showCancelForm && <div className="workday-forms"><form key="cancel" onSubmit={changeDayState}>
          <h4>Zrušit prázdný den</h4><p>Den zůstane v historii a přestane blokovat měsíční uzávěrku. Sdílené jízdy jiných řidičů se nezmění.</p>
          <label>Důvod zrušení<input name="reason" required minLength={3} maxLength={500} disabled={saving} /></label>
          <button disabled={saving}>{saving ? "Ruším…" : "Potvrdit zrušení"}</button>
          <button type="button" className="ghost" disabled={saving} onClick={() => setShowCancelForm(false)}>Ponechat den</button>
        </form></div>}
        <div className="worker-hours-summary" role="status"><strong>Práce: {formatMinutes(workedMinutes)}</strong><span>Schváleno: {formatMinutes(approvedMinutes)}</span><small>Součet pracovních úseků. Jízdy se nepřičítají, přestávky se znovu neodečítají.</small></div>
        <div className="worker-records-heading"><h4>Záznamy vybraného dne</h4><span>{workDay.entries.length} {workDay.entries.length === 1 ? "pracovní úsek" : "pracovních úseků"}</span></div>
        {workDay.entries.length + workDay.breaks.length + workDay.vehicleTrips.length === 0
          ? <p className="worker-empty-state">{workDay.state === "CANCELLED" ? "Zrušený den neobsahuje vlastní provozní záznamy." : "Zatím tu nic není. Níže přidejte první pracovní úsek."}</p>
          : <><ListSearch value={timelineQuery} onChange={setTimelineQuery} label="Hledat v dnešních záznamech" /><div className="timeline">{timelineItems.filter((item) => matchesSearch(timelineQuery, item.label, item.detail, item.kind, item.startAt, item.endAt)).map((item) => <div className={`timeline-item ${item.kind}`} key={`${item.kind}-${item.id}`}><strong>{formatInterval(item.startAt, item.endAt)}</strong><span><b>{item.label}</b>{item.entryId ? <MachineUsageDetails usages={workDay.entries.find((entry) => entry.id === item.entryId)!.machineUsages} disabled={saving}
              onEditMth={editable && ["DRAFT","RETURNED"].includes(workDay.entries.find((entry)=>entry.id===item.entryId)?.state ?? "")
                ? usage => { setWorkType(null); setExtraForm(null); setMachineEntryId(null); setMthTarget({entryId:item.entryId!,usage}); } : undefined} /> : item.detail && <small>{item.detail}</small>}{item.entryId && <small>{workStateLabel(workDay.entries.find((entry) => entry.id === item.entryId)?.state ?? "")}</small>}{item.entryId && workDay.entries.find((entry) => entry.id === item.entryId)?.state === "RETURNED" && <small className="return-reason">Důvod vrácení: {workDay.entries.find((entry) => entry.id === item.entryId)?.returnReason || "Kontaktujte vedoucího."}</small>}</span><div className="row-actions">{editable && item.entryId && ["DRAFT", "RETURNED"].includes(workDay.entries.find((entry) => entry.id === item.entryId)?.state ?? "") && canAddMachine(item.entryId) && <button className="table-action" disabled={saving} onClick={() => setMachineEntryId(item.entryId)}>Přidat stroj</button>}{editable && item.entryId && ["DRAFT", "RETURNED"].includes(workDay.entries.find((entry) => entry.id === item.entryId)?.state ?? "") && <button className="table-action" disabled={saving} onClick={() => { const entry = workDay.entries.find((entry) => entry.id === item.entryId); if (entry) { setEditingEntry(entry); setWorkType(entry.workTypeCode); setExtraForm(null); } }}>Opravit práci</button>}{editable && item.entryId && workDay.entries.find((entry) => entry.id === item.entryId)?.state === "DRAFT" && !workDay.entries.find((entry) => entry.id === item.entryId)?.hasApprovalHistory && <button className="table-action" disabled={saving} onClick={() => { if (window.confirm("Opravdu chcete tento pracovní úsek odstranit?")) void mutate(`/api/workdays/${workDay.id}/entries/${item.entryId}`, "DELETE"); }}>Odstranit</button>}{editable && item.breakId && <button className="table-action" disabled={saving} onClick={() => { if (window.confirm("Opravdu chcete tuto přestávku odstranit?")) void mutate(`/api/workdays/${workDay.id}/breaks/${item.breakId}`, "DELETE"); }}>Odstranit</button>}</div></div>)}{timelineItems.length > 0 && !timelineItems.some((item) => matchesSearch(timelineQuery, item.label, item.detail, item.kind, item.startAt, item.endAt)) && <p className="muted">Žádný dnešní záznam neodpovídá hledání.</p>}</div></>}
        {editable && mthTarget && <WorkerMthCorrectionForm key={mthTarget.usage.id}
          workDayId={workDay.id} entryId={mthTarget.entryId} usage={mthTarget.usage} onClose={()=>setMthTarget(null)}
          onSaved={()=>{setMthTarget(null);void load().catch(()=>setError("MTH se uložily, ale přehled se nepodařilo obnovit. Obnovte stránku."));}} />}
        {editable && machineEntryId && <form className="machine-usage-form" onSubmit={addMachine}>
          <header className="machine-form-heading">
            <div>
              <p className="eyebrow">ÚDAJE K PRACOVNÍMU ÚSEKU</p>
              <h4>Připojit stroj k pracovnímu úseku</h4>
            </div>
            <button type="button" className="close-button" aria-label="Zavřít formulář" onClick={() => { setMachineEntryId(null); setSelectedMachineId(""); }}>×</button>
          </header>
          {machineEntry && <div className="machine-target">
            <span>Vybraný pracovní úsek · můžete připojit více strojů</span>
            <strong>{machineEntry.projectCode} · {machineEntry.workTypeName}</strong>
            <small>{formatInterval(machineEntry.startAt, machineEntry.endAt)} · tento čas platí pro každý přidaný stroj</small>
          </div>}
          <div className="machine-form-fields">
            <label>Stroj<select name="machineId" required value={selectedMachineId} onChange={(event) => setSelectedMachineId(event.target.value)}><option value="">Nejprve vyberte stroj</option>{availableMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.code} · {machine.name}</option>)}</select></label>
            {selectedMachineId && <fieldset className="machine-attachments" key={`attachments-${selectedMachineId}`}><legend>Příslušenství ke stroji</legend><div>{attachments.map((attachment) => <label className="checkbox" key={attachment.id}><input type="checkbox" name="attachmentIds" value={attachment.id} /> <span>{attachment.code} · {attachment.name}</span></label>)}</div>{attachments.length === 0 && <small>Žádné aktivní příslušenství není v evidenci.</small>}</fieldset>}
            <div className="machine-reading-fields" key={selectedMachineId}>
            {machines.find((machine) => machine.id === selectedMachineId)?.tracksMth && <>
              <label>Počáteční stav MTH<input name="startMth" type="number" min="0" step="0.01" required defaultValue={machines.find((machine) => machine.id === selectedMachineId)?.latestMth ?? ""} /><small>Předvyplněno posledním známým stavem. Pokud se liší, upravte ho.</small></label>
              <label>Konečný stav MTH<input name="endMth" type="number" min="0" step="0.01" required /><small>Hodnota nesmí být nižší než počáteční stav.</small></label>
            </>}
            <p className="form-hint">Palivo zapisujete za tento konkrétní stroj jako jeho obsluha.</p><label>Spotřebované palivo (l)<input name="fuelConsumed" type="number" min="0" step="0.01" inputMode="decimal" /></label>
            <label>Natankované palivo (l)<input name="fuelRefuelled" type="number" min="0" step="0.01" inputMode="decimal" /></label>
            <label>Poznámka/Porucha<textarea name="note" maxLength={2000} rows={3} placeholder="Stav stroje nebo zjištěná porucha (nepovinné)" /></label>
            </div>
          </div>
          <div className="machine-form-actions"><button type="button" className="ghost" disabled={saving} onClick={() => { setMachineEntryId(null); setSelectedMachineId(""); }}>Zrušit</button><button type="submit" disabled={saving}>{saving ? "Ukládám…" : "Uložit stroj k úseku"}</button></div>
        </form>}
        {editable && !showCancelForm && !workType && !extraForm && !machineEntryId && presets && <div className="worker-step"><StepNumber value={workDay.entries.length + 2} /><div><h4>Co jste dělal(a)?</h4><p>Vyberte jednu možnost. Další obrazovka se otevře hned potom.</p></div><div className="work-type-picker"><div>{workTypes.map(([code, name]) => <button key={code} onClick={() => setWorkType(code)}><strong>{name}</strong><small>Pokračovat</small></button>)}<button type="button" className="secondary" disabled={saving} onClick={() => setExtraForm("vehicle")}><strong>Automobil</strong><small>Řidič nebo cestující</small></button></div></div></div>}
        {editable && workType && <div className="workday-forms"><form key={editingEntry?.id ?? "new"} onSubmit={addEntry}><div className="worker-step-heading"><StepNumber value={workDay.entries.length + 2} /><div><p className="eyebrow">{editingEntry ? "OPRAVA PRACOVNÍHO ÚSEKU" : "NOVÝ PRACOVNÍ ÚSEK"}</p><h4>{workTypes.find(([code]) => code === workType)?.[1] ?? "Ostatní"}</h4></div></div><p className="form-hint">Zadejte zakázku a skutečný čas. Konec musí být později než začátek.</p><label>Na které zakázce jste pracoval(a)?<select name="projectId" required defaultValue={editingEntry?.projectId ?? ""}><option value="" disabled>Zvolte zakázku ze seznamu</option>{editingEntry && !openProjects.some((project) => project.id === editingEntry.projectId) && <option value={editingEntry.projectId}>{editingEntry.projectCode} · {editingEntry.projectName}</option>}{openProjects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label>{workType === "TREE_CUTTING" && <label>Jakou činnost jste dělal(a)?<select name="workActivityCode" required defaultValue={editingEntry?.workActivityCode ?? ""}><option value="" disabled>Vyberte činnost</option>{[...treeActivities, ...historicalWorkActivities.filter(([code]) => code === editingEntry?.workActivityCode)].map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>}<BusinessDateTimeField name="startAt" label="Začátek práce" defaultValue={editingEntry?.startAt} defaultLocalValue={defaultStart} /><BusinessDateTimeField name="endAt" label="Konec práce" defaultValue={editingEntry?.endAt} defaultLocalValue={defaultTimes.end} /><label>Popis práce<input name="description" maxLength={2000} required={workType === "OTHER"} defaultValue={editingEntry?.description ?? ""} /></label><button disabled={saving || (!editingEntry && openProjects.length === 0)}>{saving ? "Ukládám…" : "Uložit pracovní úsek"}</button><button type="button" className="ghost" disabled={saving} onClick={() => { setWorkType(null); setEditingEntry(null); }}>Zrušit a vrátit se</button>{openProjects.length === 0 && <p className="form-hint">Momentálně není dostupná žádná otevřená zakázka. Obraťte se na vedoucího.</p>}</form></div>}
        {editable && extraForm === "vehicle" && <VehicleTripForm workDayId={workDay.id} vehicles={vehicles} employees={employees}
          employeeId={employeeId} workDate={today} saving={saving} onDriverSubmit={addVehicleTrip} onPassengerSubmit={joinVehicleTrip}
          onClose={() => setExtraForm(null)} />}
        {editable && workDay.entries.length > 0 && <div className="submit-day-wrap"><p>Před odesláním zkontrolujte zakázky a časy v dnešních záznamech.</p><button className="submit-day" disabled={saving} onClick={() => { if (window.confirm("Odeslat pracovní den vedoucímu ke schválení? Poté už nepůjde běžně upravovat.")) void mutate(`/api/workdays/${workDay.id}/submit`, "POST"); }}>{saving ? "Odesílám…" : "Zkontrolovat a odeslat pracovní den"}</button></div>}
      </>}
    </section>
  );
}

function StepNumber({ value }: { value: number }) { return <span className="worker-step-number" aria-hidden="true">{value}</span>; }
function time(value: string) { return businessTime(value); }
function formatInterval(startAt: string, endAt: string) {
  const startDate = businessDate(startAt);
  const endDate = businessDate(endAt);
  return `${time(startAt)}–${time(endAt)}${startDate !== endDate ? " (+1 den)" : ""}`;
}

function formatMinutes(minutes: number) { const rounded = Math.round(minutes); return `${Math.floor(rounded / 60)} h ${rounded % 60} min`; }
