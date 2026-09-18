import { useEffect, useMemo, useRef, useState } from "react";
import {
  getListContractorCompaniesQueryKey,
  getListMachinesQueryKey,
  getListRegionsQueryKey,
  getListVehiclesQueryKey,
  getListWeatherTypesQueryKey,
  getListWorkersQueryKey,
  useListContractorCompanies,
  useListMachines,
  useListRegions,
  useListVehicles,
  useListWeatherTypes,
  useListWorkers,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { todayISO } from "@/lib/utils";
import { calculateMachineMthTotal, sumMachineMthTotals, sumMachineValue, uniqueIds, type MachineMthEntry, type VehicleEntry, type WorkerTimeEntry } from "@/lib/recordEntries";
import type { MowingFormData } from "@/components/MowingForm";

interface Props {
  initialData?: Partial<MowingFormData>;
  onSubmit: (data: MowingFormData) => Promise<void>;
  onCancel: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  coreWorkerMode?: boolean;
  optionData?: ManualMowingOptionData;
}

export type ManualMowingOptionData = {
  workers: Array<{ id: number; firstName: string; lastName: string; isActive?: boolean; contractorCompanyId?: number | null; defaultBrushcutter?: boolean; defaultSlopeMower?: boolean; defaultSubcontractor?: boolean }>;
  contractorCompanies?: Array<{ id: number; name: string; companyId?: string | null; isActive?: boolean }>;
  vehicles: Array<{ id: number; name: string; licensePlate?: string | null; isActive?: boolean; defaultSlopeMower?: boolean }>;
  machines?: Array<{ id: number; name: string; type?: string | null; mowingCategory?: string | null; isActive?: boolean }>;
  regions: Array<{ id: number; name: string; isActive?: boolean }>;
  weatherTypes: Array<{ id: number; name: string; isActive?: boolean }>;
};

const inputClass = "w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base";
const labelClass = "block text-sm font-semibold text-foreground mb-2";
const sectionClass = "zenops-form-shell rounded-[1.7rem] p-5 md:p-6 xl:p-7 space-y-5";
const sectionTitle = "text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4";

export default function ManualMowingForm({ initialData, onSubmit, onCancel, onBack, isLoading, coreWorkerMode = false, optionData }: Props) {
  const { isAdmin } = useAuth();
  const workerQuery = useListWorkers({ query: { enabled: !optionData, queryKey: getListWorkersQueryKey() } });
  const contractorQuery = useListContractorCompanies({ query: { enabled: !optionData, queryKey: getListContractorCompaniesQueryKey() } });
  const vehicleQuery = useListVehicles({ query: { enabled: !optionData, queryKey: getListVehiclesQueryKey() } });
  const machineQuery = useListMachines({ query: { enabled: !optionData, queryKey: getListMachinesQueryKey() } });
  const regionQuery = useListRegions({ query: { enabled: !optionData, queryKey: getListRegionsQueryKey() } });
  const weatherQuery = useListWeatherTypes({ query: { enabled: !optionData, queryKey: getListWeatherTypesQueryKey() } });
  const workers = optionData?.workers ?? workerQuery.data;
  const contractorCompanies = optionData?.contractorCompanies ?? contractorQuery.data;
  const vehicles = optionData?.vehicles ?? vehicleQuery.data;
  const machines = optionData?.machines ?? machineQuery.data;
  const regions = optionData?.regions ?? regionQuery.data;
  const weatherTypes = optionData?.weatherTypes ?? weatherQuery.data;
  const defaultsApplied = useRef(false);

  const [kind, setKind] = useState(coreWorkerMode ? "core" : initialData?.manualMowingKind ?? "");
  const [contractorCompanyId, setContractorCompanyId] = useState(initialData?.contractorCompanyId ?? 0);
  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [regionId, setRegionId] = useState(initialData?.regionId ?? 0);
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [startTime, setStartTime] = useState(initialData?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialData?.endTime ?? "");
  const [weatherTypeIds, setWeatherTypeIds] = useState<number[]>(initialData?.weatherTypeIds ?? []);
  const [temperature, setTemperature] = useState(initialData?.temperature != null ? String(initialData.temperature) : "");
  const [workerEntries, setWorkerEntries] = useState<WorkerTimeEntry[]>(initialData?.workerTimeEntries ?? []);
  const [machineEntries, setMachineEntries] = useState<MachineMthEntry[]>(initialData?.machineMthEntries ?? []);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>(initialData?.vehicleEntries ?? []);
  const [brushRefueling, setBrushRefueling] = useState(initialData?.brushcutterRefueling != null ? String(initialData.brushcutterRefueling) : "");
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");

  const activeWorkers = workers?.filter((item) => item.isActive !== false && (kind === "subcontractor" ? item.contractorCompanyId === contractorCompanyId : item.contractorCompanyId == null)) ?? [];
  const activeContractorCompanies = contractorCompanies?.filter((item) => item.isActive !== false) ?? [];
  const activeVehicles = vehicles?.filter((item) => item.isActive !== false) ?? [];
  const activeRegions = regions?.filter((item) => item.isActive !== false) ?? [];
  const activeWeather = weatherTypes?.filter((item) => item.isActive !== false) ?? [];
  const slopeMachines = machines?.filter((item) => item.isActive !== false && (item.mowingCategory === "slope_mower" || item.type === "svahové sečení")) ?? [];
  const machineMap = useMemo(() => new Map((machines ?? []).map((item) => [item.id, item])), [machines]);

  useEffect(() => {
    if (defaultsApplied.current || initialData?.date || !kind || !workers || !vehicles || (kind === "subcontractor" && !contractorCompanyId)) return;
    defaultsApplied.current = true;
    const defaultWorkers = coreWorkerMode ? activeWorkers : activeWorkers.filter((worker) => kind === "core" ? worker.defaultBrushcutter : kind === "slope" ? worker.defaultSlopeMower : worker.defaultSubcontractor);
    setWorkerEntries(defaultWorkers.map((worker) => ({
      workerId: worker.id,
      category: "manual",
      shiftType: kind === "slope" ? "custom" : "morning",
      startTime: kind === "slope" ? null : "08:00",
      endTime: kind === "slope" ? null : "16:00",
    })));
    if (kind === "slope") {
      setVehicleEntries(activeVehicles.filter((vehicle) => vehicle.defaultSlopeMower).map((vehicle) => ({ vehicleId: vehicle.id, kmStart: null, kmEnd: null, kmTotal: null, refueling: null })));
    }
  }, [kind, contractorCompanyId, workers, vehicles, coreWorkerMode]);

  const selectKind = (value: string) => {
    defaultsApplied.current = false;
    setKind(value);
    setContractorCompanyId(0);
    setWorkerEntries([]);
    setMachineEntries([]);
    setVehicleEntries([]);
    setError("");
  };

  const toggleWorker = (workerId: number) => {
    setWorkerEntries((current) => current.some((entry) => entry.workerId === workerId)
      ? current.filter((entry) => entry.workerId !== workerId)
      : [...current, { workerId, category: "manual", shiftType: kind === "slope" ? "custom" : "morning", startTime: kind === "slope" ? null : "08:00", endTime: kind === "slope" ? null : "16:00" }]);
  };

  const setShift = (workerId: number, shiftType: "morning" | "evening" | "custom") => {
    setWorkerEntries((current) => current.map((entry) => entry.workerId !== workerId ? entry : {
      ...entry,
      shiftType,
      startTime: shiftType === "morning" ? "08:00" : shiftType === "evening" ? "16:00" : entry.startTime,
      endTime: shiftType === "morning" ? "16:00" : shiftType === "evening" ? "08:00" : entry.endTime,
    }));
  };

  const updateWorkerTime = (workerId: number, field: "startTime" | "endTime", value: string) => {
    setWorkerEntries((current) => current.map((entry) => entry.workerId === workerId ? { ...entry, shiftType: "custom", [field]: value || null } : entry));
  };

  const addVehicle = () => setVehicleEntries((current) => [...current, { vehicleId: 0, kmStart: null, kmEnd: null, kmTotal: null, refueling: null }]);
  const updateVehicle = (index: number, field: keyof VehicleEntry, value: string) => setVehicleEntries((current) => current.map((entry, entryIndex) => {
    if (entryIndex !== index) return entry;
    const parsed = value === "" ? null : Number(value);
    const next = { ...entry, [field]: parsed == null || Number.isNaN(parsed) ? (field === "vehicleId" ? 0 : null) : parsed };
    return { ...next, kmTotal: calculateMachineMthTotal(next.kmStart, next.kmEnd) };
  }));

  const addSlopeMachine = () => setMachineEntries((current) => [...current, { machineId: 0, accessoryId: null, operatorId: null, startTime: startTime || null, endTime: endTime || null, mthStart: null, mthEnd: null, mthTotal: null, fuelConsumption: null, refueling: null }]);
  const selectSlopeMachine = async (index: number, machineId: number) => {
    setMachineEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, machineId, mthStart: null, mthEnd: null, mthTotal: null } : entry));
    if (!machineId) return;
    try {
      const response = await fetch(`/api/machines/${machineId}/last-mth`, { credentials: "include" });
      if (!response.ok) return;
      const result = await response.json() as { mthEnd: number | null };
      if (result.mthEnd == null) return;
      setMachineEntries((current) => current.map((entry, entryIndex) => entryIndex === index && entry.machineId === machineId ? { ...entry, mthStart: result.mthEnd } : entry));
    } catch { /* ruční zadání zůstává dostupné */ }
  };
  const updateMachine = (index: number, field: "mthStart" | "mthEnd" | "refueling", value: string) => setMachineEntries((current) => current.map((entry, entryIndex) => {
    if (entryIndex !== index) return entry;
    const parsed = value === "" ? null : Number(value);
    const next = { ...entry, [field]: parsed == null || Number.isNaN(parsed) ? null : parsed, startTime: startTime || null, endTime: endTime || null };
    return { ...next, mthTotal: calculateMachineMthTotal(next.mthStart, next.mthEnd) };
  }));

  const handleWeather = (id: number) => {
    if (!weatherTypeIds.includes(id) && weatherTypeIds.length >= 3) { setError("Počasí lze vybrat maximálně třikrát."); return; }
    setWeatherTypeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (!date || !regionId) { setError("Datum a revír jsou povinné"); return; }
    if (kind === "subcontractor" && !contractorCompanyId) { setError("Vyberte subdodavatelskou firmu"); return; }
    if (!workerEntries.length) { setError("Vyberte alespoň jednoho pracovníka"); return; }
    if (workerEntries.some((entry) => !entry.startTime || !entry.endTime)) { setError("U každého pracovníka vyplňte začátek a konec směny"); return; }
    if (vehicleEntries.some((entry) => !entry.vehicleId || (entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart))) { setError("Doplňte platné údaje všech jízd aut"); return; }
    if (kind === "slope" && (!machineEntries.length || machineEntries.some((entry) => !entry.machineId || entry.mthStart == null || entry.mthEnd == null || entry.mthTotal == null))) { setError("Doplňte svahové sekačky a jejich motohodiny"); return; }
    const singleVehicle = vehicleEntries.length === 1 ? vehicleEntries[0] : null;
    await onSubmit({
      date, regionId, workType: "seceni", mowingSection: "manual", mowingKind: "rucni", manualMowingKind: kind, contractorCompanyId: kind === "subcontractor" ? contractorCompanyId : null,
      location: location.trim() || null, startTime: kind === "slope" ? startTime || null : null, endTime: kind === "slope" ? endTime || null : null,
      weatherTypeId: weatherTypeIds[0] ?? null, weatherTypeIds, temperature: temperature ? Number(temperature) : null,
      vehicleId: singleVehicle?.vehicleId ?? null, vehicleEntries,
      mthStart: machineEntries.length === 1 ? machineEntries[0].mthStart : null, mthEnd: machineEntries.length === 1 ? machineEntries[0].mthEnd : null,
      mthTotal: sumMachineMthTotals(machineEntries), fuelConsumption: null, refueling: sumMachineValue(machineEntries, "refueling"),
      workerIds: workerEntries.map((entry) => entry.workerId), manualWorkerIds: workerEntries.map((entry) => entry.workerId), machineWorkerIds: [], workerTimeEntries: workerEntries,
      machineIds: machineEntries.map((entry) => entry.machineId), machineMthEntries: machineEntries, accessoryIds: [], assignedAverage: null,
      dayHours: null, nightHours: null, laborHours: null,
      vehicleKmStart: singleVehicle?.kmStart ?? null, vehicleKmEnd: singleVehicle?.kmEnd ?? null,
      vehicleKmTotal: vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.kmTotal ?? 0), 0) * 100) / 100 : null,
      vehicleRefueling: vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.refueling ?? 0), 0) * 100) / 100 : null,
      brushcutterRefueling: (kind === "core" || kind === "subcontractor") && brushRefueling ? Number(brushRefueling) : null,
      trafficMarking: null, note: note.trim() || null,
    });
  };

  if (!isAdmin && !coreWorkerMode) return <div className={sectionClass}><h2 className="text-xl font-bold">Ruční sečení</h2><p>Tuto část může evidovat pouze administrátor.</p><button onClick={onCancel} className="px-4 py-2 rounded-xl bg-secondary">Zpět</button></div>;

  if (!kind) return (
    <div className="space-y-6"><div className={sectionClass}><p className={sectionTitle}>Ruční sečení</p><h2 className="text-xl font-bold">Vyberte typ denního záznamu</h2><div className="grid md:grid-cols-3 gap-4">
      <button onClick={() => selectKind("core")} className="rounded-2xl border-2 border-primary/30 p-5 text-left"><b>Kmenoví pracovníci</b><span className="block text-sm text-muted-foreground mt-1">Křovinořezy a směny</span></button>
      <button onClick={() => selectKind("slope")} className="rounded-2xl border-2 border-primary/30 p-5 text-left"><b>Svahové sekačky</b><span className="block text-sm text-muted-foreground mt-1">MTH, auta a pracovníci</span></button>
      <button onClick={() => selectKind("subcontractor")} className="rounded-2xl border-2 border-primary/30 p-5 text-left"><b>Subdodavatel</b><span className="block text-sm text-muted-foreground mt-1">Křovinořezy, firmy a jejich pracovníci</span></button>
    </div></div><div className="flex gap-3"><button onClick={onBack ?? onCancel} className="px-5 py-3 rounded-xl border border-border">Zpět</button><button onClick={onCancel} className="px-5 py-3 rounded-xl bg-secondary">Zrušit</button></div></div>
  );

  return <form onSubmit={handleSubmit} className="space-y-6">
    {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">{error}</div>}
    <div className={sectionClass}><div className="flex justify-between gap-3"><div><p className={sectionTitle}>Ruční sečení</p><h2 className="text-xl font-bold">{kind === "core" ? "Kmenoví pracovníci – křovinořezy" : kind === "slope" ? "Svahové sekačky" : "Křovinořezy subdodavatele"}</h2></div>{!coreWorkerMode && !initialData?.date && <button type="button" onClick={() => selectKind("")} className="text-primary">Změnit variantu</button>}</div></div>

    {kind === "subcontractor" && <div className={sectionClass}><p className={sectionTitle}>Subdodavatelská firma</p><label className={labelClass}>Firma *</label><select value={contractorCompanyId || ""} onChange={(e) => { setContractorCompanyId(Number(e.target.value)); setWorkerEntries([]); defaultsApplied.current = false; }} className={inputClass}><option value="">-- Vyberte firmu --</option>{activeContractorCompanies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.companyId ? ` (IČO ${company.companyId})` : ""}</option>)}</select>{!activeContractorCompanies.length && <p className="mt-2 text-sm text-muted-foreground">Nejdřív vytvořte firmu a její pracovníky v Číselnících.</p>}</div>}

    <div className={sectionClass}><p className={sectionTitle}>Pracovníci a směny</p>{kind === "subcontractor" && !contractorCompanyId ? <p className="text-sm text-muted-foreground">Nejprve vyberte firmu.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{activeWorkers.map((worker) => { const selected = workerEntries.some((entry) => entry.workerId === worker.id); return <label key={worker.id} className={`rounded-xl border p-3 cursor-pointer ${selected ? "border-primary bg-primary/5" : "border-border"}`}><input type="checkbox" checked={selected} onChange={() => toggleWorker(worker.id)} className="mr-2" />{worker.firstName} {worker.lastName}{worker.defaultSubcontractor && kind === "subcontractor" ? " • výchozí" : ""}</label>; })}</div>}
      <div className="space-y-3">{workerEntries.map((entry) => { const worker = activeWorkers.find((item) => item.id === entry.workerId); return <div key={entry.workerId} className="rounded-xl border p-4"><b>{worker ? `${worker.firstName} ${worker.lastName}` : `Pracovník #${entry.workerId}`}</b><div className="grid sm:grid-cols-3 gap-3 mt-3">{kind !== "slope" && <div><label className={labelClass}>Směna</label><select value={entry.shiftType ?? "custom"} onChange={(e) => setShift(entry.workerId, e.target.value as "morning" | "evening" | "custom")} className={inputClass}><option value="morning">Ranní 8–16</option><option value="evening">Odpolední 16–8</option><option value="custom">Vlastní čas</option></select></div>}<div><label className={labelClass}>Od</label><input type="time" value={entry.startTime ?? ""} onChange={(e) => updateWorkerTime(entry.workerId, "startTime", e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Do</label><input type="time" value={entry.endTime ?? ""} onChange={(e) => updateWorkerTime(entry.workerId, "endTime", e.target.value)} className={inputClass} /></div></div></div>; })}</div>
    </div>

    {kind === "slope" && <div className={sectionClass}><p className={sectionTitle}>Svahové sekačky</p><div className="space-y-3">{machineEntries.map((entry, index) => <div key={index} className="rounded-xl border p-4"><div className="flex justify-between"><b>Sekačka {index + 1}</b><button type="button" onClick={() => setMachineEntries((current) => current.filter((_, i) => i !== index))} className="text-destructive">Odebrat</button></div><div className="grid sm:grid-cols-4 gap-3 mt-3"><select value={entry.machineId || ""} onChange={(e) => void selectSlopeMachine(index, Number(e.target.value))} className={inputClass}><option value="">-- Vyberte sekačku --</option>{slopeMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select><input type="number" step="0.1" min="0" placeholder="MTH začátek" value={entry.mthStart ?? ""} onChange={(e) => updateMachine(index, "mthStart", e.target.value)} className={inputClass} /><input type="number" step="0.1" min="0" placeholder="MTH konec" value={entry.mthEnd ?? ""} onChange={(e) => updateMachine(index, "mthEnd", e.target.value)} className={inputClass} /><input type="number" step="0.1" min="0" placeholder="Tankování (l)" value={entry.refueling ?? ""} onChange={(e) => updateMachine(index, "refueling", e.target.value)} className={inputClass} /></div><p className="mt-2 text-sm text-muted-foreground">Rozdíl MTH: {entry.mthTotal ?? "—"}</p></div>)}</div><button type="button" onClick={addSlopeMachine} className="w-full rounded-xl border-2 border-dashed border-primary/30 p-3 text-primary font-semibold">+ Přidat svahovou sekačku</button></div>}

    <div className={sectionClass}><p className={sectionTitle}>Jízdy aut</p>{vehicleEntries.map((entry, index) => <div key={index} className="rounded-xl border p-4 mb-3"><div className="flex justify-between"><b>Jízda {index + 1}</b><button type="button" onClick={() => setVehicleEntries((current) => current.filter((_, i) => i !== index))} className="text-destructive">Odebrat</button></div><div className="grid sm:grid-cols-5 gap-3 mt-3"><select value={entry.vehicleId || ""} onChange={(e) => updateVehicle(index, "vehicleId", e.target.value)} className={inputClass}><option value="">-- Vyberte auto --</option>{activeVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ""}</option>)}</select><input type="number" min="0" step="0.1" placeholder="Počáteční km" value={entry.kmStart ?? ""} onChange={(e) => updateVehicle(index, "kmStart", e.target.value)} className={inputClass} /><input type="number" min="0" step="0.1" placeholder="Koncové km" value={entry.kmEnd ?? ""} onChange={(e) => updateVehicle(index, "kmEnd", e.target.value)} className={inputClass} /><input readOnly placeholder="Celkem km" value={entry.kmTotal ?? ""} className={`${inputClass} bg-muted/40`} /><input type="number" min="0" step="0.1" placeholder="Tankování (l)" value={entry.refueling ?? ""} onChange={(e) => updateVehicle(index, "refueling", e.target.value)} className={inputClass} /></div></div>)}<button type="button" onClick={addVehicle} className="w-full rounded-xl border-2 border-dashed border-primary/30 p-3 text-primary font-semibold">+ Přidat jízdu auta</button></div>

    <div className={sectionClass}><p className={sectionTitle}>Základní evidence</p><div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Datum *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Kraj / Revír *</label><select value={regionId || ""} onChange={(e) => setRegionId(Number(e.target.value))} className={inputClass}><option value="">-- Vyberte revír --</option>{activeRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></div><div className="sm:col-span-2"><label className={labelClass}>Místo zakázky</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} /></div>{kind === "slope" && <><div><label className={labelClass}>Pracovní doba od</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} /></div><div><label className={labelClass}>Pracovní doba do</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} /></div></>}</div></div>

    <div className={sectionClass}><p className={sectionTitle}>Počasí a provoz</p><div className="grid sm:grid-cols-2 gap-4"><div><label className={labelClass}>Počasí (max. 3)</label><div className="flex flex-wrap gap-2">{activeWeather.map((weather) => <label key={weather.id} className="rounded-lg border px-3 py-2"><input type="checkbox" checked={weatherTypeIds.includes(weather.id)} onChange={() => handleWeather(weather.id)} className="mr-2" />{weather.name}</label>)}</div></div><div><label className={labelClass}>Teplota (°C)</label><input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputClass} /></div>{kind !== "slope" && <div><label className={labelClass}>Tankování křovinořezů (l)</label><input type="number" min="0" step="0.1" value={brushRefueling} onChange={(e) => setBrushRefueling(e.target.value)} className={inputClass} /></div>}<div className="sm:col-span-2"><label className={labelClass}>Poznámka</label><textarea value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} rows={3} /></div></div></div>

    <div className="flex gap-3"><button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl border">Zrušit</button><button type="submit" disabled={isLoading} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">{isLoading ? "Ukládám..." : "Uložit denní záznam"}</button></div>
  </form>;
}
