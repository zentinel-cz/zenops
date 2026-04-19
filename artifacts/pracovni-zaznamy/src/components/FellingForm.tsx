import { useState } from "react";
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

export interface FellingFormData {
  date: string;
  regionId: number;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  weatherTypeId: number | null;
  temperature: number | null;
  mth: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
  workerIds: number[];
  vehicleIds: number[];
  machineIds: number[];
  accessoryIds: number[];
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

export default function FellingForm({ initialData, onSubmit, onCancel, isLoading }: FellingFormProps) {
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
  const [temperature, setTemperature] = useState<string>(initialData?.temperature != null ? String(initialData.temperature) : "");
  const [mth, setMth] = useState<string>(initialData?.mth != null ? String(initialData.mth) : "");
  const [fuelConsumption, setFuelConsumption] = useState<string>(initialData?.fuelConsumption != null ? String(initialData.fuelConsumption) : "");
  const [refueling, setRefueling] = useState<string>(initialData?.refueling != null ? String(initialData.refueling) : "");
  const [workerIds, setWorkerIds] = useState<number[]>(initialData?.workerIds ?? []);
  const [vehicleIds, setVehicleIds] = useState<number[]>(initialData?.vehicleIds ?? []);
  const [machineIds, setMachineIds] = useState<number[]>(initialData?.machineIds ?? []);
  const [accessoryIds, setAccessoryIds] = useState<number[]>(initialData?.accessoryIds ?? []);
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!date) { setError("Datum je povinné"); return; }
    if (!regionId) { setError("Kraj / revír je povinný"); return; }

    try {
      await onSubmit({
        date,
        regionId,
        location: location.trim() || null,
        startTime: startTime || null,
        endTime: endTime || null,
        weatherTypeId,
        temperature: temperature !== "" ? parseInt(temperature, 10) : null,
        mth: mth !== "" ? parseFloat(mth) : null,
        fuelConsumption: fuelConsumption !== "" ? parseFloat(fuelConsumption) : null,
        refueling: refueling !== "" ? parseFloat(refueling) : null,
        workerIds,
        vehicleIds,
        machineIds,
        accessoryIds,
        note: note.trim() || null,
      });
    } catch {
      setError("Chyba při ukládání záznamu. Zkuste to prosím znovu.");
    }
  };

  const activeRegions = regions?.filter((r) => r.isActive !== false) ?? [];
  const activeWeather = weatherTypes?.filter((w) => w.isActive !== false) ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Kraj / Revír *</label>
            <select
              value={regionId || ""}
              onChange={(e) => setRegionId(Number(e.target.value))}
              required
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          <div>
            <label className={labelClass}>Teplota (°C)</label>
            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="napr. 12"
              min="-40"
              max="50"
              className={inputClass}
            />
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
          getName={(w) => `${itemString(w, "firstName")} ${itemString(w, "lastName")}`.trim()}
        />
      </div>

      {/* Auta */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Auta / Vozidla ({vehicleIds.length} vybráno)</p>
        <MultiCheckList
          items={vehicles ?? []}
          selectedIds={vehicleIds}
          onToggle={(id) => setVehicleIds(toggleId(vehicleIds, id))}
          emptyMessage="Žádná vozidla v číselníku"
          getName={(v) => itemString(v, "name") || itemString(v, "plateNumber")}
          getBadge={(v) => itemNullableString(v, "licensePlate") ?? itemNullableString(v, "plateNumber")}
        />
      </div>

      {/* Stroje */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Traktory / Stroje ({machineIds.length} vybráno)</p>
        <MultiCheckList
          items={machines ?? []}
          selectedIds={machineIds}
          onToggle={(id) => setMachineIds(toggleId(machineIds, id))}
          emptyMessage="Žádné stroje v číselníku"
          getName={(m) => itemString(m, "name")}
          getBadge={(m) => itemString(m, "type") || null}
        />
      </div>

      {/* Příslušenství */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Příslušenství / Sestavy ({accessoryIds.length} vybráno) — volitelně</p>
        <MultiCheckList
          items={accessories ?? []}
          selectedIds={accessoryIds}
          onToggle={(id) => setAccessoryIds(toggleId(accessoryIds, id))}
          emptyMessage="Žádné příslušenství v číselníku"
          getName={(a) => itemString(a, "name")}
          getBadge={(a) => itemNullableString(a, "type")}
        />
      </div>

      {/* Provozní hodnoty */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Provozní hodnoty</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>MTH (motohodiny)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={mth}
              onChange={(e) => setMth(e.target.value)}
              placeholder="napr. 8.5"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Spotřeba (l)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(e.target.value)}
              placeholder="napr. 45.0"
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
              placeholder="napr. 60.0"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Poznámka */}
      <div className={sectionClass}>
        <p className={sectionTitle}>Poznámka</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Volitelné poznámky k záznamu..."
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
