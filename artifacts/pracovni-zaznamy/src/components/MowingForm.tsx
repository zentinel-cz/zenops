import { useState, useEffect } from "react";
import {
  useListWorkers,
  useListVehicles,
  useListMachines,
  useListAccessories,
  useListRegions,
  useListWeatherTypes,
} from "@workspace/api-client-react";
import { todayISO } from "@/lib/utils";

export interface MowingFormData {
  date: string;
  regionId: number;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  weatherTypeId: number | null;
  vehicleId: number | null;
  mthStart: number | null;
  mthEnd: number | null;
  mthTotal: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
  workerIds: number[];
  machineIds: number[];
  accessoryIds: number[];
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
const sectionClass = "bg-card border border-card-border rounded-2xl p-5 space-y-4 shadow-sm";
const sectionTitle = "text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4";

function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
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
  const active = items.filter((i) => i.isActive && !i.deletedAt);
  if (!active.length) return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

export default function MowingForm({ initialData, onSubmit, onCancel, isLoading }: MowingFormProps) {
  const { data: workers } = useListWorkers();
  const { data: vehicles } = useListVehicles();
  const { data: machines } = useListMachines();
  const { data: accessories } = useListAccessories();
  const { data: regions } = useListRegions();
  const { data: weatherTypes } = useListWeatherTypes();

  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [regionId, setRegionId] = useState<number>(initialData?.regionId ?? 0);
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [startTime, setStartTime] = useState(initialData?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialData?.endTime ?? "");
  const [weatherTypeId, setWeatherTypeId] = useState<number | null>(initialData?.weatherTypeId ?? null);
  const [vehicleId, setVehicleId] = useState<number | null>(initialData?.vehicleId ?? null);
  const [mthStart, setMthStart] = useState<string>(initialData?.mthStart != null ? String(initialData.mthStart) : "");
  const [mthEnd, setMthEnd] = useState<string>(initialData?.mthEnd != null ? String(initialData.mthEnd) : "");
  const [mthTotal, setMthTotal] = useState<string>(initialData?.mthTotal != null ? String(initialData.mthTotal) : "");
  const [fuelConsumption, setFuelConsumption] = useState<string>(initialData?.fuelConsumption != null ? String(initialData.fuelConsumption) : "");
  const [refueling, setRefueling] = useState<string>(initialData?.refueling != null ? String(initialData.refueling) : "");
  const [workerIds, setWorkerIds] = useState<number[]>(initialData?.workerIds ?? []);
  const [machineIds, setMachineIds] = useState<number[]>(initialData?.machineIds ?? []);
  const [accessoryIds, setAccessoryIds] = useState<number[]>(initialData?.accessoryIds ?? []);
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const start = parseFloat(mthStart);
    const end = parseFloat(mthEnd);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      setMthTotal(String(Math.round((end - start) * 100) / 100));
    } else if (mthStart === "" && mthEnd === "") {
      setMthTotal("");
    }
  }, [mthStart, mthEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!date) { setError("Datum je povinné"); return; }
    if (!regionId) { setError("Kraj / revír je povinný"); return; }

    const startNum = mthStart !== "" ? parseFloat(mthStart) : null;
    const endNum = mthEnd !== "" ? parseFloat(mthEnd) : null;
    const totalNum = mthTotal !== "" ? parseFloat(mthTotal) : null;

    if (startNum !== null && endNum !== null && endNum < startNum) {
      setError("Koncové MTH musí být větší nebo rovno počátečnímu MTH");
      return;
    }

    try {
      await onSubmit({
        date,
        regionId,
        location: location.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        weatherTypeId,
        vehicleId,
        mthStart: startNum,
        mthEnd: endNum,
        mthTotal: totalNum,
        fuelConsumption: fuelConsumption !== "" ? parseFloat(fuelConsumption) : null,
        refueling: refueling !== "" ? parseFloat(refueling) : null,
        workerIds,
        machineIds,
        accessoryIds,
        note: note.trim() || null,
      });
    } catch {
      setError("Chyba při ukládání záznamu. Zkuste to prosím znovu.");
    }
  };

  const activeRegions = regions?.filter((r) => r.isActive && !r.deletedAt) ?? [];
  const activeWeather = weatherTypes?.filter((w) => w.isActive && !w.deletedAt) ?? [];
  const activeVehicles = vehicles?.filter((v) => v.isActive && !v.deletedAt) ?? [];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Základní informace */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Základní informace</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Datum *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kraj / Revír *</label>
            <select
              value={regionId || ""}
              onChange={(e) => setRegionId(Number(e.target.value))}
              className={inputClass}
            >
              <option value="">-- Vyberte revír --</option>
              {activeRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.code ? ` (${r.code})` : ""}
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

      {/* Pracovní doba a počasí */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Pracovní doba & Počasí</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Začátek</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Konec</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Počasí</label>
            <select
              value={weatherTypeId ?? ""}
              onChange={(e) => setWeatherTypeId(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">—</option>
              {activeWeather.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Obsluha / Pracovníci */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Obsluha / Pracovníci ({workerIds.length} vybráno)</p>
        <MultiCheckList
          items={workers ?? []}
          selectedIds={workerIds}
          onToggle={(id) => setWorkerIds(toggleId(workerIds, id))}
          emptyMessage="Žádní pracovníci v číselníku"
          getName={(w) => `${(w as { firstName: string; lastName: string }).firstName} ${(w as { firstName: string; lastName: string }).lastName}`}
        />
      </div>

      {/* Stroje / Traktory */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Stroj / Traktor ({machineIds.length} vybráno)</p>
        <MultiCheckList
          items={machines ?? []}
          selectedIds={machineIds}
          onToggle={(id) => setMachineIds(toggleId(machineIds, id))}
          emptyMessage="Žádné stroje v číselníku"
          getName={(m) => (m as { name: string }).name}
          getBadge={(m) => (m as { type: string }).type}
        />
      </div>

      {/* Příslušenství */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Příslušenství / Sestava ({accessoryIds.length} vybráno) — volitelně</p>
        <MultiCheckList
          items={accessories ?? []}
          selectedIds={accessoryIds}
          onToggle={(id) => setAccessoryIds(toggleId(accessoryIds, id))}
          emptyMessage="Žádné příslušenství v číselníku"
          getName={(a) => (a as { name: string }).name}
          getBadge={(a) => (a as { type?: string | null }).type ?? null}
        />
      </div>

      {/* MTH */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Motohodiny (MTH)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Počáteční MTH</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={mthStart}
              onChange={(e) => setMthStart(e.target.value)}
              placeholder="napr. 1250.5"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Koncové MTH</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={mthEnd}
              onChange={(e) => setMthEnd(e.target.value)}
              placeholder="napr. 1258.0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-2`}>
              Celkové MTH
              {mthStart && mthEnd && (
                <span className="text-xs font-normal text-primary">(dopočítáno)</span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={mthTotal}
              onChange={(e) => setMthTotal(e.target.value)}
              placeholder="napr. 7.5"
              className={`${inputClass} ${mthStart && mthEnd ? "bg-primary/5 border-primary/30" : ""}`}
            />
          </div>
        </div>
        {mthStart && mthEnd && parseFloat(mthEnd) >= parseFloat(mthStart) && (
          <p className="text-xs text-primary">
            Celkové MTH = {Math.round((parseFloat(mthEnd) - parseFloat(mthStart)) * 100) / 100} hod
          </p>
        )}
      </div>

      {/* Provozní hodnoty */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Provozní hodnoty</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Auto / Vozidlo</label>
            <select
              value={vehicleId ?? ""}
              onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">— Nevyplněno —</option>
              {activeVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}{v.licensePlate ? ` (${v.licensePlate})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Spotřeba (l)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(e.target.value)}
              placeholder="napr. 35.0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tankování (l)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={refueling}
              onChange={(e) => setRefueling(e.target.value)}
              placeholder="napr. 40.0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Poznámka / Porucha */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Poznámka / Porucha</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Volitelné poznámky, hlášení poruch, zvláštní situace..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Akce */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {isLoading ? "Ukládám..." : "Uložit záznam"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-3 bg-secondary text-secondary-foreground border border-border rounded-xl text-base font-medium hover:bg-secondary/80 disabled:opacity-60"
        >
          Zrušit
        </button>
      </div>
    </form>
  );
}
