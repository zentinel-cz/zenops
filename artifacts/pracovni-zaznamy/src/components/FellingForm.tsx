import { useEffect, useMemo, useState } from "react";
import {
  useListWorkers,
  useListVehicles,
  useListMachines,
  useListAccessories,
  useListRegions,
  useListWeatherTypes,
} from "@workspace/api-client-react";
import { todayISO } from "@/lib/utils";
import { itemString, itemNullableString } from "@/lib/ui-item";
import { FELLING_WORK_TYPE_OPTIONS } from "@/lib/recordOptions";
import {
  calculateMachineMthTotal,
  sumMachineMthTotals,
  sumMachineValue,
  syncMachineMthEntries,
  syncWorkerTimeEntries,
  toggleId,
  uniqueIds,
  type MachineMthEntry,
  type WorkerTimeEntry,
} from "@/lib/recordEntries";

export interface FellingFormData {
  date: string;
  regionId: number;
  workType: string | null;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  weatherTypeId: number | null;
  weatherTypeIds: number[];
  temperature: number | null;
  mth: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
  workerIds: number[];
  manualWorkerIds: number[];
  machineWorkerIds: number[];
  workerTimeEntries: WorkerTimeEntry[];
  vehicleIds: number[];
  machineIds: number[];
  machineMthEntries: MachineMthEntry[];
  accessoryIds: number[];
  assignedAverage: string | null;
  vehicleKmStart: number | null;
  vehicleKmEnd: number | null;
  vehicleKmTotal: number | null;
  vehicleRefueling: number | null;
  trafficMarking: string | null;
  note: string | null;
}

interface FellingFormProps {
  initialData?: Partial<FellingFormData>;
  onSubmit: (data: FellingFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const inputClass = "w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-base leading-normal transition-colors";
const labelClass = "block text-sm font-semibold text-foreground mb-2";
const sectionClass = "zenops-form-shell rounded-[1.7rem] p-5 md:p-6 xl:p-7 space-y-5";
const sectionTitle = "text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4";

function MultiCheckList({
  items,
  selectedIds,
  onToggle,
  emptyMessage,
  getName,
  getBadge,
}: {
  items: { id: number; isActive: boolean; deletedAt?: Date | string | null }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  emptyMessage: string;
  getName: (item: (typeof items)[number]) => string;
  getBadge?: (item: (typeof items)[number]) => string | null | undefined;
}) {
  const active = items.filter((item) => item.isActive && !item.deletedAt);
  if (!active.length) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
      {active.map((item) => {
        const checked = selectedIds.includes(item.id);
        const badge = getBadge?.(item);
        return (
          <label
            key={item.id}
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
              checked
                ? "border-primary bg-primary/8 text-foreground shadow-sm"
                : "border-border bg-background hover:border-primary/50 hover:bg-accent/20"
            }`}
          >
            <input
              type="checkbox"
              className="w-5 h-5 accent-primary shrink-0"
              checked={checked}
              onChange={() => onToggle(item.id)}
            />
            <span className="text-sm min-w-0 flex-1 font-medium">
              {getName(item)}
              {badge && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-secondary text-secondary-foreground font-medium">
                  {badge}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function EntryCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.4rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,249,253,0.92))] p-4 lg:p-5 space-y-4 shadow-[0_14px_30px_rgba(11,36,56,0.06)]">{children}</div>;
}

export default function FellingForm({ initialData, onSubmit, onCancel, isLoading }: FellingFormProps) {
  const { data: workers } = useListWorkers();
  const { data: vehicles } = useListVehicles();
  const { data: machines } = useListMachines();
  const { data: accessories } = useListAccessories();
  const { data: regions } = useListRegions();
  const { data: weatherTypes } = useListWeatherTypes();

  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [regionId, setRegionId] = useState<number>(initialData?.regionId ?? 0);
  const [workType, setWorkType] = useState(initialData?.workType ?? "kaceni");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [startTime, setStartTime] = useState(initialData?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialData?.endTime ?? "");
  const [weatherTypeIds, setWeatherTypeIds] = useState<number[]>(initialData?.weatherTypeIds ?? (initialData?.weatherTypeId ? [initialData.weatherTypeId] : []));
  const [temperature, setTemperature] = useState<string>(initialData?.temperature != null ? String(initialData.temperature) : "");
  const [manualWorkerIds, setManualWorkerIds] = useState<number[]>(initialData?.manualWorkerIds ?? initialData?.workerIds ?? []);
  const [machineWorkerIds, setMachineWorkerIds] = useState<number[]>(initialData?.machineWorkerIds ?? []);
  const [workerTimeEntries, setWorkerTimeEntries] = useState<WorkerTimeEntry[]>(initialData?.workerTimeEntries ?? []);
  const [vehicleIds, setVehicleIds] = useState<number[]>(initialData?.vehicleIds ?? []);
  const [machineIds, setMachineIds] = useState<number[]>(initialData?.machineIds ?? []);
  const [machineMthEntries, setMachineMthEntries] = useState<MachineMthEntry[]>(initialData?.machineMthEntries ?? []);
  const [accessoryIds, setAccessoryIds] = useState<number[]>(initialData?.accessoryIds ?? []);
  const [assignedAverage, setAssignedAverage] = useState(initialData?.assignedAverage ?? "");
  const [vehicleKmStart, setVehicleKmStart] = useState<string>(initialData?.vehicleKmStart != null ? String(initialData.vehicleKmStart) : "");
  const [vehicleKmEnd, setVehicleKmEnd] = useState<string>(initialData?.vehicleKmEnd != null ? String(initialData.vehicleKmEnd) : "");
  const [vehicleKmTotal, setVehicleKmTotal] = useState<string>(initialData?.vehicleKmTotal != null ? String(initialData.vehicleKmTotal) : "");
  const [vehicleRefueling, setVehicleRefueling] = useState<string>(initialData?.vehicleRefueling != null ? String(initialData.vehicleRefueling) : "");
  const [trafficMarking, setTrafficMarking] = useState(initialData?.trafficMarking ?? "");
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setWorkerTimeEntries((current) => syncWorkerTimeEntries(current, manualWorkerIds, "manual", startTime, endTime));
  }, [manualWorkerIds, startTime, endTime]);

  useEffect(() => {
    setWorkerTimeEntries((current) => syncWorkerTimeEntries(current, machineWorkerIds, "machine", startTime, endTime));
  }, [machineWorkerIds, startTime, endTime]);

  useEffect(() => {
    setMachineMthEntries((current) => syncMachineMthEntries(current, machineIds, startTime, endTime));
  }, [machineIds, startTime, endTime]);

  useEffect(() => {
    const start = parseFloat(vehicleKmStart);
    const end = parseFloat(vehicleKmEnd);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      setVehicleKmTotal(String(Math.round((end - start) * 100) / 100));
    } else if (vehicleKmStart === "" && vehicleKmEnd === "") {
      setVehicleKmTotal("");
    }
  }, [vehicleKmStart, vehicleKmEnd]);

  const activeRegions = regions?.filter((region) => region.isActive !== false) ?? [];
  const activeWeather = weatherTypes?.filter((weather) => weather.isActive !== false) ?? [];
  const workerMap = useMemo(() => new Map((workers ?? []).map((worker) => [worker.id, worker])), [workers]);
  const machineMap = useMemo(() => new Map((machines ?? []).map((machine) => [machine.id, machine])), [machines]);
  const totalMachineMth = sumMachineMthTotals(machineMthEntries);
  const totalFuelConsumption = sumMachineValue(machineMthEntries, "fuelConsumption");
  const totalRefueling = sumMachineValue(machineMthEntries, "refueling");

  const handleWeatherToggle = (id: number) => {
    setError("");
    if (!weatherTypeIds.includes(id) && weatherTypeIds.length >= 3) {
      setError("Počasí lze vybrat maximálně 3x zároveň.");
      return;
    }
    setWeatherTypeIds(toggleId(weatherTypeIds, id));
  };

  const updateWorkerEntry = (workerId: number, changes: Partial<WorkerTimeEntry>) => {
    setWorkerTimeEntries((current) =>
      current.map((entry) => (entry.workerId === workerId ? { ...entry, ...changes } : entry)),
    );
  };

  const updateMachineEntry = (machineId: number, field: "mthStart" | "mthEnd" | "fuelConsumption" | "refueling", value: string) => {
    setMachineMthEntries((current) =>
      current.map((entry) => {
        if (entry.machineId !== machineId) return entry;
        const parsedValue = value === "" ? null : parseFloat(value);
        const nextEntry = {
          ...entry,
          [field]: Number.isNaN(parsedValue as number) ? null : parsedValue,
        };
        return {
          ...nextEntry,
          mthTotal: calculateMachineMthTotal(nextEntry.mthStart, nextEntry.mthEnd),
        };
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!date) { setError("Datum je povinné"); return; }
    if (!regionId) { setError("Kraj / revír je povinný"); return; }
    if (!workType) { setError("Typ práce je povinný"); return; }

    const invalidWorkerTime = workerTimeEntries.find((entry) => !entry.startTime || !entry.endTime);
    if (invalidWorkerTime) {
      setError("U každého vybraného pracovníka vyplňte čas od i do.");
      return;
    }

    const invalidMachineEntry = machineMthEntries.find((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthTotal == null);
    if (invalidMachineEntry) {
      setError("U každého vybraného stroje vyplňte začátek i konec směny.");
      return;
    }

    const vehicleKmStartNum = vehicleKmStart !== "" ? parseFloat(vehicleKmStart) : null;
    const vehicleKmEndNum = vehicleKmEnd !== "" ? parseFloat(vehicleKmEnd) : null;
    const vehicleKmTotalNum = vehicleKmTotal !== "" ? parseFloat(vehicleKmTotal) : null;

    if (vehicleKmStartNum !== null && vehicleKmEndNum !== null && vehicleKmEndNum < vehicleKmStartNum) {
      setError("Koncový stav km musí být větší nebo rovno počátečnímu stavu");
      return;
    }

    const normalizedWorkerEntries = workerTimeEntries.map((entry) => ({
      workerId: entry.workerId,
      category: entry.category,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }));
    const normalizedMachineEntries = machineMthEntries.map((entry) => ({
      machineId: entry.machineId,
      accessoryId: entry.accessoryId ?? null,
      operatorId: entry.operatorId ?? null,
      startTime: entry.startTime,
      endTime: entry.endTime,
      mthStart: entry.mthStart,
      mthEnd: entry.mthEnd,
      mthTotal: entry.mthTotal,
      fuelConsumption: entry.fuelConsumption,
      refueling: entry.refueling,
    }));

    try {
      await onSubmit({
        date,
        regionId,
        workType,
        location: location.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        weatherTypeId: weatherTypeIds[0] ?? null,
        weatherTypeIds,
        temperature: temperature !== "" ? parseInt(temperature, 10) : null,
        mth: totalMachineMth,
        fuelConsumption: totalFuelConsumption,
        refueling: totalRefueling,
        workerIds: uniqueIds(manualWorkerIds, machineWorkerIds),
        manualWorkerIds,
        machineWorkerIds,
        workerTimeEntries: normalizedWorkerEntries,
        vehicleIds,
        machineIds,
        machineMthEntries: normalizedMachineEntries,
        accessoryIds,
        assignedAverage: assignedAverage.trim() || null,
        vehicleKmStart: vehicleKmStartNum,
        vehicleKmEnd: vehicleKmEndNum,
        vehicleKmTotal: vehicleKmTotalNum,
        vehicleRefueling: vehicleRefueling !== "" ? parseFloat(vehicleRefueling) : null,
        trafficMarking: trafficMarking.trim() || null,
        note: note.trim() || null,
      });
    } catch {
      setError("Chyba při ukládání záznamu. Zkuste to prosím znovu.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className={sectionClass}>
        <p className={sectionTitle}>Typ práce</p>
        <div>
          <label className={labelClass}>Typ *</label>
          <select value={workType ?? ""} onChange={(e) => setWorkType(e.target.value)} className={inputClass}>
            <option value="">-- Vyberte typ --</option>
            {FELLING_WORK_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Základní informace</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Datum *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kraj / Revír *</label>
            <select value={regionId || ""} onChange={(e) => setRegionId(Number(e.target.value))} required className={inputClass}>
              <option value="">-- Vyberte revír --</option>
              {activeRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}{region.code ? ` (${region.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Místo</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokalita, parcela, popis terénu..." className={inputClass} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Pracovní doba & Počasí</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Začátek</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Konec</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teplota (°C)</label>
            <input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="např. 12" min="-40" max="50" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Počasí (max. 3)</label>
          <MultiCheckList
            items={activeWeather}
            selectedIds={weatherTypeIds}
            onToggle={handleWeatherToggle}
            emptyMessage="Žádné typy počasí v číselníku"
            getName={(item) => itemString(item, "name")}
          />
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Obsluha</p>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Ruční obsluha ({manualWorkerIds.length})</p>
            <MultiCheckList
              items={workers ?? []}
              selectedIds={manualWorkerIds}
              onToggle={(id) => setManualWorkerIds(toggleId(manualWorkerIds, id))}
              emptyMessage="Žádní pracovníci v číselníku"
              getName={(worker) => `${itemString(worker, "firstName")} ${itemString(worker, "lastName")}`.trim()}
            />
          </div>

          {workerTimeEntries.filter((entry) => entry.category === "manual").length > 0 && (
            <div className="space-y-3">
              {workerTimeEntries.filter((entry) => entry.category === "manual").map((entry) => {
                const worker = workerMap.get(entry.workerId);
                return (
                  <EntryCard key={`manual-${entry.workerId}`}>
                    <p className="text-sm font-semibold text-foreground">
                      {worker ? `${itemString(worker, "firstName")} ${itemString(worker, "lastName")}`.trim() : `Pracovník #${entry.workerId}`}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Pracoval od</label>
                        <input type="time" value={entry.startTime ?? ""} onChange={(e) => updateWorkerEntry(entry.workerId, { startTime: e.target.value || null })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Pracoval do</label>
                        <input type="time" value={entry.endTime ?? ""} onChange={(e) => updateWorkerEntry(entry.workerId, { endTime: e.target.value || null })} className={inputClass} />
                      </div>
                    </div>
                  </EntryCard>
                );
              })}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Strojní obsluha ({machineWorkerIds.length})</p>
            <MultiCheckList
              items={workers ?? []}
              selectedIds={machineWorkerIds}
              onToggle={(id) => setMachineWorkerIds(toggleId(machineWorkerIds, id))}
              emptyMessage="Žádní pracovníci v číselníku"
              getName={(worker) => `${itemString(worker, "firstName")} ${itemString(worker, "lastName")}`.trim()}
            />
          </div>

          {workerTimeEntries.filter((entry) => entry.category === "machine").length > 0 && (
            <div className="space-y-3">
              {workerTimeEntries.filter((entry) => entry.category === "machine").map((entry) => {
                const worker = workerMap.get(entry.workerId);
                return (
                  <EntryCard key={`machine-${entry.workerId}`}>
                    <p className="text-sm font-semibold text-foreground">
                      {worker ? `${itemString(worker, "firstName")} ${itemString(worker, "lastName")}`.trim() : `Pracovník #${entry.workerId}`}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Pracoval od</label>
                        <input type="time" value={entry.startTime ?? ""} onChange={(e) => updateWorkerEntry(entry.workerId, { startTime: e.target.value || null })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Pracoval do</label>
                        <input type="time" value={entry.endTime ?? ""} onChange={(e) => updateWorkerEntry(entry.workerId, { endTime: e.target.value || null })} className={inputClass} />
                      </div>
                    </div>
                  </EntryCard>
                );
              })}
            </div>
          )}

          <div>
            <label className={labelClass}>Přiřazený průměr</label>
            <input type="text" value={assignedAverage} onChange={(e) => setAssignedAverage(e.target.value)} placeholder="Např. A/D, B/E, C/F" className={inputClass} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Auta / Vozidla ({vehicleIds.length} vybráno)</p>
        <MultiCheckList
          items={vehicles ?? []}
          selectedIds={vehicleIds}
          onToggle={(id) => setVehicleIds(toggleId(vehicleIds, id))}
          emptyMessage="Žádná vozidla v číselníku"
          getName={(vehicle) => itemString(vehicle, "name") || itemString(vehicle, "plateNumber")}
          getBadge={(vehicle) => itemNullableString(vehicle, "licensePlate") ?? itemNullableString(vehicle, "plateNumber")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Počáteční km</label>
            <input type="number" step="0.1" min="0" value={vehicleKmStart} onChange={(e) => setVehicleKmStart(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Koncové km</label>
            <input type="number" step="0.1" min="0" value={vehicleKmEnd} onChange={(e) => setVehicleKmEnd(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Celkem km</label>
            <input type="number" step="0.1" min="0" value={vehicleKmTotal} onChange={(e) => setVehicleKmTotal(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tankování vozidla (l)</label>
            <input type="number" step="0.1" min="0" value={vehicleRefueling} onChange={(e) => setVehicleRefueling(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Traktory / Stroje ({machineIds.length} vybráno)</p>
        <MultiCheckList
          items={machines ?? []}
          selectedIds={machineIds}
          onToggle={(id) => setMachineIds(toggleId(machineIds, id))}
          emptyMessage="Žádné stroje v číselníku"
          getName={(machine) => itemString(machine, "name")}
          getBadge={(machine) => itemString(machine, "type") || null}
        />

        {machineMthEntries.length > 0 && (
          <div className="space-y-3 pt-1">
            {machineMthEntries.map((entry) => {
              const machine = machineMap.get(entry.machineId);
              return (
                <EntryCard key={entry.machineId}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">
                        {machine ? itemString(machine, "name") : `Stroj #${entry.machineId}`}
                      </p>
                      {machine && itemNullableString(machine, "type") && (
                        <p className="text-xs text-muted-foreground">{itemNullableString(machine, "type")}</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-primary/15 bg-primary/6 px-4 py-3 xl:min-w-[180px]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">MTH za den</p>
                      <p className="mt-1 text-lg font-semibold text-primary">{entry.mthTotal != null ? `${entry.mthTotal}` : "—"}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Provoz stroje</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-5 gap-4">
                      <div>
                        <label className={labelClass}>Začátek směny</label>
                        <input type="number" step="0.1" min="0" value={entry.mthStart ?? ""} onChange={(e) => updateMachineEntry(entry.machineId, "mthStart", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Konec směny</label>
                        <input type="number" step="0.1" min="0" value={entry.mthEnd ?? ""} onChange={(e) => updateMachineEntry(entry.machineId, "mthEnd", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Hodiny za den</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={entry.mthTotal ?? ""}
                          readOnly
                          className={`${inputClass} bg-muted/40 text-muted-foreground cursor-not-allowed`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Spotřeba (l)</label>
                        <input type="number" step="0.1" min="0" value={entry.fuelConsumption ?? ""} onChange={(e) => updateMachineEntry(entry.machineId, "fuelConsumption", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Tankování (l)</label>
                        <input type="number" step="0.1" min="0" value={entry.refueling ?? ""} onChange={(e) => updateMachineEntry(entry.machineId, "refueling", e.target.value)} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </EntryCard>
              );
            })}
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-foreground">Součet za všechny stroje</div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">MTH: {totalMachineMth != null ? `${totalMachineMth}` : "—"}</div>
                <div className="text-xs text-muted-foreground">Spotřeba: {totalFuelConsumption != null ? `${totalFuelConsumption} l` : "—"} • Tankování: {totalRefueling != null ? `${totalRefueling} l` : "—"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Příslušenství / Sestavy ({accessoryIds.length} vybráno)</p>
        <MultiCheckList
          items={accessories ?? []}
          selectedIds={accessoryIds}
          onToggle={(id) => setAccessoryIds(toggleId(accessoryIds, id))}
          emptyMessage="Žádné příslušenství v číselníku"
          getName={(accessory) => itemString(accessory, "name")}
          getBadge={(accessory) => itemNullableString(accessory, "type")}
        />
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Dopravní značení</p>
        <textarea
          value={trafficMarking}
          onChange={(e) => setTrafficMarking(e.target.value)}
          rows={3}
          placeholder="Např. OA1 + P1, OA2 + P2, FN + šipka, traktor nebo OA dle silnice"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Poznámka</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Volitelné poznámky, tankování, poruchy..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent/30 transition-colors">
          Zrušit
        </button>
        <button type="submit" disabled={isLoading} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
          {isLoading ? "Ukládám..." : "Uložit záznam"}
        </button>
      </div>
    </form>
  );
}
