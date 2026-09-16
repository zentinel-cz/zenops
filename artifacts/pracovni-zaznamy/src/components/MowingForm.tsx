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
import { itemString } from "@/lib/ui-item";
import ManualMowingForm from "@/components/ManualMowingForm";
import {
  calculateMachineMthTotal,
  sumMachineMthTotals,
  sumMachineValue,
  syncWorkerTimeEntries,
  toggleId,
  uniqueIds,
  type MachineMthEntry,
  type VehicleEntry,
  type WorkerTimeEntry,
} from "@/lib/recordEntries";

export interface MowingFormData {
  date: string;
  regionId: number;
  workType: string | null;
  mowingSection: string | null;
  mowingKind: string | null;
  manualMowingKind: string | null;
  contractorCompanyId: number | null;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  weatherTypeId: number | null;
  weatherTypeIds: number[];
  temperature: number | null;
  vehicleId: number | null;
  vehicleEntries: VehicleEntry[];
  mthStart: number | null;
  mthEnd: number | null;
  mthTotal: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
  workerIds: number[];
  manualWorkerIds: number[];
  machineWorkerIds: number[];
  workerTimeEntries: WorkerTimeEntry[];
  machineIds: number[];
  machineMthEntries: MachineMthEntry[];
  accessoryIds: number[];
  assignedAverage: string | null;
  dayHours: number | null;
  nightHours: number | null;
  laborHours: number | null;
  vehicleKmStart: number | null;
  vehicleKmEnd: number | null;
  vehicleKmTotal: number | null;
  vehicleRefueling: number | null;
  brushcutterRefueling: number | null;
  trafficMarking: string | null;
  note: string | null;
}

interface MowingFormProps {
  initialData?: Partial<MowingFormData>;
  onSubmit: (data: MowingFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const inputClass = "w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-base leading-normal transition-colors";
const labelClass = "block text-sm font-semibold text-foreground mb-2";
const sectionClass = "zenops-form-shell rounded-[1.7rem] p-5 md:p-6 xl:p-7 space-y-5";
const sectionTitle = "text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4";

function calculateDayNightHours(startTime: string, endTime: string) {
  const parseTime = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const start = parseTime(startTime);
  const endRaw = parseTime(endTime);
  if (start == null || endRaw == null) return null;

  let end = endRaw;
  if (end <= start) end += 24 * 60;

  let dayMinutes = 0;
  let nightMinutes = 0;

  for (let minute = start; minute < end; minute += 1) {
    const minuteOfDay = minute % (24 * 60);
    if (minuteOfDay >= 6 * 60 && minuteOfDay < 18 * 60) {
      dayMinutes += 1;
    } else {
      nightMinutes += 1;
    }
  }

  const laborMinutes = dayMinutes + nightMinutes;
  const toHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

  return {
    dayHours: toHours(dayMinutes),
    nightHours: toHours(nightMinutes),
    laborHours: toHours(laborMinutes),
  };
}

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

export default function MowingForm({ initialData, onSubmit, onCancel, isLoading }: MowingFormProps) {
  const isEditing = initialData?.date != null;
  const { data: workers } = useListWorkers();
  const { data: vehicles } = useListVehicles();
  const { data: machines } = useListMachines();
  const { data: accessories } = useListAccessories();
  const { data: regions } = useListRegions();
  const { data: weatherTypes } = useListWeatherTypes();

  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [regionId, setRegionId] = useState<number>(initialData?.regionId ?? 0);
  const [workType, setWorkType] = useState(initialData?.workType ?? "seceni");
  const [mowingSection, setMowingSection] = useState(initialData?.mowingSection ?? "sec_1");
  const [mowingKind, setMowingKind] = useState(initialData?.mowingKind ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [startTime, setStartTime] = useState(initialData?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialData?.endTime ?? "");
  const [weatherTypeIds, setWeatherTypeIds] = useState<number[]>(initialData?.weatherTypeIds ?? (initialData?.weatherTypeId ? [initialData.weatherTypeId] : []));
  const [temperature, setTemperature] = useState<string>(initialData?.temperature != null ? String(initialData.temperature) : "");
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>(() => {
    if (initialData?.vehicleEntries?.length) return initialData.vehicleEntries;
    if (!initialData?.vehicleId) return [];
    return [{
      vehicleId: initialData.vehicleId,
      kmStart: initialData.vehicleKmStart ?? null,
      kmEnd: initialData.vehicleKmEnd ?? null,
      kmTotal: initialData.vehicleKmTotal ?? null,
      refueling: initialData.vehicleRefueling ?? null,
    }];
  });
  const [manualWorkerIds] = useState<number[]>(initialData?.manualWorkerIds ?? initialData?.workerIds ?? []);
  const [workerTimeEntries, setWorkerTimeEntries] = useState<WorkerTimeEntry[]>(initialData?.workerTimeEntries ?? []);
  const [machineMthEntries, setMachineMthEntries] = useState<MachineMthEntry[]>(() =>
    (initialData?.machineMthEntries ?? []).map((entry, index, entries) => ({
      ...entry,
      accessoryId: entry.accessoryId ?? (entries.length === 1 ? initialData?.accessoryIds?.[0] ?? null : null),
      operatorId: entry.operatorId ?? (entries.length === 1 ? initialData?.machineWorkerIds?.[0] ?? null : null),
      accessoryConfirmed: isEditing,
    })),
  );
  const [assignedAverage] = useState(initialData?.assignedAverage ?? "");
  const [dayHours, setDayHours] = useState<string>(initialData?.dayHours != null ? String(initialData.dayHours) : "");
  const [nightHours, setNightHours] = useState<string>(initialData?.nightHours != null ? String(initialData.nightHours) : "");
  const [laborHours, setLaborHours] = useState<string>(initialData?.laborHours != null ? String(initialData.laborHours) : "");
  const [trafficMarking, setTrafficMarking] = useState(initialData?.trafficMarking ?? "");
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");
  const machineWorkerIds = useMemo(() => uniqueIds(machineMthEntries.map((entry) => entry.operatorId).filter((id): id is number => id != null)), [machineMthEntries]);

  useEffect(() => {
    setWorkerTimeEntries((current) => syncWorkerTimeEntries(current, manualWorkerIds, "manual", startTime, endTime));
  }, [manualWorkerIds, startTime, endTime]);

  useEffect(() => {
    setWorkerTimeEntries((current) => syncWorkerTimeEntries(current, machineWorkerIds, "machine", startTime, endTime));
  }, [machineWorkerIds, startTime, endTime]);


  useEffect(() => {
    if (!startTime || !endTime) return;
    const calculated = calculateDayNightHours(startTime, endTime);
    if (!calculated) return;
    setDayHours(String(calculated.dayHours));
    setNightHours(String(calculated.nightHours));
    setLaborHours(String(calculated.laborHours));
  }, [startTime, endTime]);

  const activeRegions = regions?.filter((region) => region.isActive !== false) ?? [];
  const activeWeather = weatherTypes?.filter((weather) => weather.isActive !== false) ?? [];
  const activeVehicles = vehicles?.filter((vehicle) => vehicle.isActive !== false) ?? [];
  const activeMachines = machines?.filter((machine) => machine.isActive !== false) ?? [];
  const activeAccessories = accessories?.filter((accessory) => accessory.isActive !== false) ?? [];
  const activeWorkers = workers?.filter((worker) => worker.isActive !== false) ?? [];
  const machineMap = useMemo(() => new Map((machines ?? []).map((machine) => [machine.id, machine])), [machines]);
  const machineIds = useMemo(() => machineMthEntries.map((entry) => entry.machineId).filter((id) => id > 0), [machineMthEntries]);
  const accessoryIds = useMemo(() => uniqueIds(machineMthEntries.map((entry) => entry.accessoryId).filter((id): id is number => id != null)), [machineMthEntries]);
  const totalMachineMth = sumMachineMthTotals(machineMthEntries);
  const totalFuelConsumption = sumMachineValue(machineMthEntries, "fuelConsumption");
  const totalRefueling = sumMachineValue(machineMthEntries, "refueling");
  const setupComplete = machineMthEntries.length > 0 && machineMthEntries.every((entry) => entry.machineId > 0 && entry.accessoryConfirmed && entry.operatorId != null);

  const handleWeatherToggle = (id: number) => {
    setError("");
    if (!weatherTypeIds.includes(id) && weatherTypeIds.length >= 3) {
      setError("Počasí lze vybrat maximálně 3x zároveň.");
      return;
    }
    setWeatherTypeIds(toggleId(weatherTypeIds, id));
  };

  const addMachineAssembly = () => {
    setMachineMthEntries((current) => [...current, {
      machineId: 0,
      accessoryId: null,
      operatorId: null,
      accessoryConfirmed: false,
      startTime: startTime || null,
      endTime: endTime || null,
      mthStart: null,
      mthEnd: null,
      mthTotal: null,
      fuelConsumption: null,
      refueling: null,
    }]);
  };

  const addVehicleEntry = () => {
    setVehicleEntries((current) => [...current, { vehicleId: 0, kmStart: null, kmEnd: null, kmTotal: null, refueling: null }]);
  };

  const updateVehicleEntry = (index: number, field: keyof VehicleEntry, value: string) => {
    setVehicleEntries((current) => current.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      const parsedValue = value === "" ? null : Number(value);
      const next = { ...entry, [field]: parsedValue == null || Number.isNaN(parsedValue) ? (field === "vehicleId" ? 0 : null) : parsedValue };
      return { ...next, kmTotal: calculateMachineMthTotal(next.kmStart, next.kmEnd) };
    }));
  };

  const handleMachineSelection = async (index: number, machineId: number | null) => {
    setError("");
    if (machineId == null) {
      setMachineMthEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? {
        ...entry,
        machineId: 0,
        accessoryId: null,
        operatorId: null,
        accessoryConfirmed: false,
        mthStart: null,
        mthEnd: null,
        mthTotal: null,
      } : entry));
      return;
    }

    const machine = (machines ?? []).find((item) => item.id === machineId);
    setMachineMthEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? {
      ...entry,
      machineId,
      accessoryId: machine?.defaultAccessoryId ?? null,
      operatorId: machine?.defaultOperatorId ?? null,
      accessoryConfirmed: Boolean(machine?.defaultAccessoryId),
      mthStart: null,
      mthEnd: null,
      mthTotal: null,
    } : entry));

    try {
      const response = await fetch(`/api/machines/${machineId}/last-mth`, { credentials: "include" });
      if (!response.ok) return;
      const result = await response.json() as { mthEnd: number | null };
      if (result.mthEnd == null) return;
      setMachineMthEntries((current) => current.map((entry, entryIndex) => entryIndex === index && entry.machineId === machineId
        ? { ...entry, mthStart: result.mthEnd, mthEnd: null, mthTotal: null }
        : entry));
    } catch {
      // Formulář zůstane použitelný a počáteční MTH lze zadat ručně.
    }
  };

  const updateMachineEntry = (index: number, field: "startTime" | "endTime" | "mthStart" | "mthEnd" | "fuelConsumption" | "refueling", value: string) => {
    setMachineMthEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;
        if (field === "startTime" || field === "endTime") {
          return {
            ...entry,
            [field]: value || null,
          };
        }
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
    if (!mowingKind) { setError("Vyberte strojní nebo ruční sečení"); return; }
    if (mowingKind === "strojni" && !setupComplete) { setError("Dokončete základní sestavu každého traktoru"); return; }
    if (vehicleEntries.some((entry) => entry.vehicleId <= 0)) { setError("U každé jízdy vyberte auto"); return; }
    if (new Set(machineIds).size !== machineIds.length) { setError("Každý stroj lze do denního záznamu přidat pouze jednou"); return; }

    const invalidMachineEntry = machineMthEntries.find((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthTotal == null);
    if (invalidMachineEntry) {
      setError("Vyplňte počáteční a konečný stav motohodin. Konečný stav nesmí být nižší.");
      return;
    }

    if (vehicleEntries.some((entry) => entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart)) {
      setError("U každé jízdy musí být koncový stav km větší nebo roven počátečnímu stavu");
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
      accessoryId: entry.accessoryId,
      operatorId: entry.operatorId,
      startTime: entry.startTime,
      endTime: entry.endTime,
      mthStart: entry.mthStart,
      mthEnd: entry.mthEnd,
      mthTotal: entry.mthTotal,
      fuelConsumption: entry.fuelConsumption,
      refueling: entry.refueling,
    }));
    const singleMachineEntry = normalizedMachineEntries.length === 1 ? normalizedMachineEntries[0] : null;
    const singleVehicleEntry = vehicleEntries.length === 1 ? vehicleEntries[0] : null;
    const totalVehicleKm = vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.kmTotal ?? 0), 0) * 100) / 100 : null;
    const totalVehicleRefueling = vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.refueling ?? 0), 0) * 100) / 100 : null;
    const workerIds = uniqueIds(manualWorkerIds, machineWorkerIds);

    try {
      await onSubmit({
        date,
        regionId,
        workType,
        mowingSection: mowingSection || null,
        mowingKind: mowingKind || null,
        manualMowingKind: null,
        contractorCompanyId: null,
        location: location.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        weatherTypeId: weatherTypeIds[0] ?? null,
        weatherTypeIds,
        temperature: temperature !== "" ? parseInt(temperature, 10) : null,
        vehicleId: singleVehicleEntry?.vehicleId ?? null,
        vehicleEntries,
        mthStart: singleMachineEntry?.mthStart ?? null,
        mthEnd: singleMachineEntry?.mthEnd ?? null,
        mthTotal: totalMachineMth,
        fuelConsumption: totalFuelConsumption,
        refueling: totalRefueling,
        workerIds,
        manualWorkerIds,
        machineWorkerIds,
        workerTimeEntries: normalizedWorkerEntries,
        machineIds,
        machineMthEntries: normalizedMachineEntries,
        accessoryIds,
        assignedAverage: assignedAverage.trim() || null,
        dayHours: dayHours !== "" ? parseFloat(dayHours) : null,
        nightHours: nightHours !== "" ? parseFloat(nightHours) : null,
        laborHours: laborHours !== "" ? parseFloat(laborHours) : null,
        vehicleKmStart: singleVehicleEntry?.kmStart ?? null,
        vehicleKmEnd: singleVehicleEntry?.kmEnd ?? null,
        vehicleKmTotal: totalVehicleKm,
        vehicleRefueling: totalVehicleRefueling,
        brushcutterRefueling: null,
        trafficMarking: trafficMarking.trim() || null,
        note: note.trim() || null,
      });
    } catch {
      setError("Chyba při ukládání záznamu. Zkuste to prosím znovu.");
    }
  };

  if (!mowingKind) {
    return (
      <div className="space-y-6">
        <div className={sectionClass}>
          <p className={sectionTitle}>Nový záznam sečení</p>
          <h2 className="text-xl font-bold text-foreground">Jakým způsobem se práce prováděla?</h2>
          <p className="text-sm text-muted-foreground">Vyberte variantu záznamu. Každá bude mít vlastní formulář.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <button type="button" onClick={() => { setMowingKind("strojni"); if (machineMthEntries.length === 0) addMachineAssembly(); }} className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-left hover:border-primary hover:bg-primary/10 transition-colors">
              <span className="text-3xl">🚜</span>
              <span className="block mt-3 text-lg font-bold text-foreground">Strojní sečení</span>
              <span className="block mt-1 text-sm text-muted-foreground">Stroj, příslušenství, obsluha, motohodiny a palivo</span>
            </button>
            <button type="button" onClick={() => setMowingKind("rucni")} className="rounded-2xl border-2 border-border bg-background p-6 text-left hover:border-primary/60 hover:bg-accent/20 transition-colors">
              <span className="text-3xl">👷</span>
              <span className="block mt-3 text-lg font-bold text-foreground">Ruční sečení</span>
              <span className="block mt-1 text-sm text-muted-foreground">Samostatný formulář doplníme podle dalšího zadání</span>
            </button>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="px-5 py-3 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent/30 transition-colors">Zrušit</button>
      </div>
    );
  }

  if (mowingKind === "rucni") {
    return <ManualMowingForm initialData={{ ...initialData, mowingKind: "rucni" }} onSubmit={onSubmit} onCancel={onCancel} onBack={!isEditing ? () => setMowingKind("") : undefined} isLoading={isLoading} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className={sectionClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={sectionTitle}>Varianta záznamu</p>
            <h2 className="text-xl font-bold text-foreground">🚜 Denní záznam – strojní sečení</h2>
          </div>
          {!isEditing && <button type="button" onClick={() => setMowingKind("")} className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-medium">Změnit variantu</button>}
        </div>
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={sectionTitle}>Technika denního záznamu</p>
            <h2 className="text-lg font-bold text-foreground">Traktory a základní sestavy</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{machineMthEntries.length} {machineMthEntries.length === 1 ? "traktor" : "traktory"}{vehicleEntries.length ? ` + ${vehicleEntries.length} ${vehicleEntries.length === 1 ? "jízda auta" : "jízdy aut"}` : ""}</span>
        </div>

        <div className="space-y-4">
          {machineMthEntries.map((entry, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white/75 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-foreground">Traktor {index + 1}</h3>
                {machineMthEntries.length > 1 && <button type="button" onClick={() => setMachineMthEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="text-sm font-medium text-destructive hover:underline">Odebrat</button>}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span><label className="text-sm font-semibold text-foreground">Stroj / Traktor *</label></div>
                  <select value={entry.machineId || ""} onChange={(e) => void handleMachineSelection(index, e.target.value ? Number(e.target.value) : null)} className={inputClass}>
                    <option value="">-- Vyberte stroj --</option>
                    {activeMachines.map((machine) => <option key={machine.id} value={machine.id} disabled={machineIds.includes(machine.id) && machine.id !== entry.machineId}>{machine.name}{machine.type ? ` (${machine.type})` : ""}</option>)}
                  </select>
                </div>
                <div className={entry.machineId <= 0 ? "opacity-45" : ""}>
                  <div className="flex items-center gap-2 mb-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${entry.machineId > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span><label className="text-sm font-semibold text-foreground">Příslušenství *</label></div>
                  <select value={entry.accessoryConfirmed ? (entry.accessoryId != null ? String(entry.accessoryId) : "none") : ""} onChange={(e) => setMachineMthEntries((current) => current.map((item, entryIndex) => entryIndex === index ? { ...item, accessoryId: e.target.value === "none" ? null : Number(e.target.value), accessoryConfirmed: Boolean(e.target.value) } : item))} className={inputClass} disabled={entry.machineId <= 0}>
                    <option value="">-- Vyberte příslušenství --</option>
                    <option value="none">Bez příslušenství</option>
                    {activeAccessories.map((accessory) => <option key={accessory.id} value={accessory.id}>{accessory.name}{accessory.type ? ` (${accessory.type})` : ""}</option>)}
                  </select>
                </div>
                <div className={!entry.accessoryConfirmed ? "opacity-45" : ""}>
                  <div className="flex items-center gap-2 mb-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${entry.accessoryConfirmed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</span><label className="text-sm font-semibold text-foreground">Obsluha *</label></div>
                  <select value={entry.operatorId ?? ""} onChange={(e) => setMachineMthEntries((current) => current.map((item, entryIndex) => entryIndex === index ? { ...item, operatorId: e.target.value ? Number(e.target.value) : null } : item))} className={inputClass} disabled={!entry.accessoryConfirmed}>
                    <option value="">-- Vyberte pracovníka --</option>
                    {activeWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.firstName} {worker.lastName}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" onClick={addMachineAssembly} className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 font-semibold text-primary hover:bg-primary/10">+ Přidat další traktor</button>
          <button type="button" onClick={addVehicleEntry} className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 font-semibold text-primary hover:bg-primary/10">+ Přidat jízdu auta</button>
        </div>

        {vehicleEntries.map((entry, index) => (
          <div key={`vehicle-${index}`} className="rounded-2xl border border-slate-200 bg-white/75 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-foreground">Jízda auta {index + 1}</h3>
              <button type="button" onClick={() => setVehicleEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="text-sm font-medium text-destructive hover:underline">Odebrat</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="sm:col-span-2 xl:col-span-1">
                <label className={labelClass}>Auto / Vozidlo *</label>
                <select value={entry.vehicleId || ""} onChange={(e) => updateVehicleEntry(index, "vehicleId", e.target.value)} className={inputClass}>
                  <option value="">-- Vyberte auto --</option>
                  {activeVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ""}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Počáteční km</label><input type="number" step="0.1" min="0" value={entry.kmStart ?? ""} onChange={(e) => updateVehicleEntry(index, "kmStart", e.target.value)} className={inputClass} disabled={!entry.vehicleId} /></div>
              <div><label className={labelClass}>Koncové km</label><input type="number" step="0.1" min="0" value={entry.kmEnd ?? ""} onChange={(e) => updateVehicleEntry(index, "kmEnd", e.target.value)} className={inputClass} disabled={!entry.vehicleId} /></div>
              <div><label className={labelClass}>Celkem km</label><input type="number" step="0.1" min="0" value={entry.kmTotal ?? ""} readOnly className={`${inputClass} bg-muted/40`} disabled={!entry.vehicleId} /></div>
              <div><label className={labelClass}>Tankování (l)</label><input type="number" step="0.1" min="0" value={entry.refueling ?? ""} onChange={(e) => updateVehicleEntry(index, "refueling", e.target.value)} className={inputClass} disabled={!entry.vehicleId} /></div>
            </div>
          </div>
        ))}

        {!setupComplete && (
          <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            U každého traktoru dokončete výběr stroje, příslušenství a obsluhy.
          </div>
        )}
      </div>

      {setupComplete ? (
        <>
      <div className={sectionClass}>
        <p className={sectionTitle}>Základní evidence</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Datum *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kraj / Revír *</label>
            <select value={regionId || ""} onChange={(e) => setRegionId(Number(e.target.value))} className={inputClass}>
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
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lokalita, parcela, popis terénu..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Pracovní doba & Počasí</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Začátek</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Konec</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-4 items-start">
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
          <div>
            <label className={labelClass}>Teplota (°C)</label>
            <input type="number" min="-40" max="50" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className={sectionClass}>
        <p className={sectionTitle}>Provozní údaje stroje</p>

        {machineMthEntries.length > 0 && (
          <div className="space-y-3">
            {machineMthEntries.map((entry, index) => {
              const machine = machineMap.get(entry.machineId);
              return (
                <EntryCard key={`${entry.machineId}-${index}`}>
                  <p className="text-base font-semibold text-foreground">{machine ? itemString(machine, "name") : `Stroj #${entry.machineId}`}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    <div>
                      <label className={labelClass}>MTH začátek *</label>
                      <input type="number" step="0.1" min="0" value={entry.mthStart ?? ""} onChange={(e) => updateMachineEntry(index, "mthStart", e.target.value)} className={inputClass} />
                      <p className="mt-1 text-xs text-muted-foreground">Přebírá se poslední koncový stav</p>
                    </div>
                    <div>
                      <label className={labelClass}>MTH konec *</label>
                      <input type="number" step="0.1" min="0" value={entry.mthEnd ?? ""} onChange={(e) => updateMachineEntry(index, "mthEnd", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Rozdíl MTH</label>
                      <input type="number" value={entry.mthTotal ?? ""} readOnly className={`${inputClass} bg-muted/40 font-semibold text-primary cursor-not-allowed`} />
                    </div>
                    <div>
                      <label className={labelClass}>Spotřeba (l)</label>
                      <input type="number" step="0.1" min="0" value={entry.fuelConsumption ?? ""} onChange={(e) => updateMachineEntry(index, "fuelConsumption", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tankování (l)</label>
                      <input type="number" step="0.1" min="0" value={entry.refueling ?? ""} onChange={(e) => updateMachineEntry(index, "refueling", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                </EntryCard>
              );
            })}
          </div>
        )}
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
          placeholder="Volitelné poznámky, tankování, poruchy, střídání kotoučky..."
          className={`${inputClass} resize-none`}
        />
      </div>

        </>
      ) : null}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="button" onClick={onCancel} className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-accent/30 transition-colors">
          Zrušit
        </button>
        <button type="submit" disabled={isLoading || !setupComplete} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
          {isLoading ? "Ukládám..." : "Uložit záznam"}
        </button>
      </div>
    </form>
  );
}
