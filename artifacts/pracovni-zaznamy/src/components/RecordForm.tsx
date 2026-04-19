import { useState } from "react";
import { useListWorkers, useListVehicles, useListMachines, useListRegions, useListWeatherTypes } from "@workspace/api-client-react";
import { todayISO } from "@/lib/utils";

export interface FellingFormData {
  date: string;
  regionId: number;
  weatherTypeId: number | null;
  vehicleId: number | null;
  workerIds: number[];
  machineIds: number[];
  treesCount: number | null;
  volumeM3: number | null;
  note: string;
}

export interface MowingFormData {
  date: string;
  regionId: number;
  weatherTypeId: number | null;
  vehicleId: number | null;
  workerIds: number[];
  machineIds: number[];
  areaHa: number | null;
  note: string;
}

type FormData = FellingFormData | MowingFormData;

interface RecordFormProps {
  type: "kaceni" | "seceni";
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function RecordForm({ type, initialData, onSubmit, onCancel, isLoading }: RecordFormProps) {
  const { data: workers } = useListWorkers();
  const { data: vehicles } = useListVehicles();
  const { data: machines } = useListMachines();
  const { data: regions } = useListRegions();
  const { data: weatherTypes } = useListWeatherTypes();

  const [date, setDate] = useState(initialData?.date ?? todayISO());
  const [regionId, setRegionId] = useState<number>(initialData?.regionId ?? 0);
  const [weatherTypeId, setWeatherTypeId] = useState<number | null>(initialData?.weatherTypeId ?? null);
  const [vehicleId, setVehicleId] = useState<number | null>(initialData?.vehicleId ?? null);
  const [workerIds, setWorkerIds] = useState<number[]>(initialData?.workerIds ?? []);
  const [machineIds, setMachineIds] = useState<number[]>(initialData?.machineIds ?? []);
  const [treesCount, setTreesCount] = useState<string>((initialData as FellingFormData)?.treesCount?.toString() ?? "");
  const [volumeM3, setVolumeM3] = useState<string>((initialData as FellingFormData)?.volumeM3?.toString() ?? "");
  const [areaHa, setAreaHa] = useState<string>((initialData as MowingFormData)?.areaHa?.toString() ?? "");
  const [note, setNote] = useState(initialData?.note ?? "");
  const [error, setError] = useState("");

  const toggleWorker = (id: number) => {
    setWorkerIds((prev) => prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]);
  };
  const toggleMachine = (id: number) => {
    setMachineIds((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regionId) { setError("Vyberte revír"); return; }
    try {
      const base = { date, regionId, weatherTypeId, vehicleId, workerIds, machineIds, note };
      if (type === "kaceni") {
        await onSubmit({ ...base, treesCount: treesCount ? parseInt(treesCount) : null, volumeM3: volumeM3 ? parseFloat(volumeM3) : null } as FellingFormData);
      } else {
        await onSubmit({ ...base, areaHa: areaHa ? parseFloat(areaHa) : null } as MowingFormData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Chyba při ukládání záznamu");
    }
  };

  const inputClass = "w-full px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded px-3 py-2 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="date">Datum *</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="region">Revír *</label>
          <select id="region" value={regionId} onChange={(e) => setRegionId(Number(e.target.value))} required className={inputClass}>
            <option value={0}>-- Vyberte revír --</option>
            {regions?.filter((r) => r.isActive).map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.code ? ` (${r.code})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="weather">Počasí</label>
          <select id="weather" value={weatherTypeId ?? ""} onChange={(e) => setWeatherTypeId(e.target.value ? Number(e.target.value) : null)} className={inputClass}>
            <option value="">-- Nevybráno --</option>
            {weatherTypes?.filter((w) => w.isActive).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="vehicle">Vozidlo</label>
          <select id="vehicle" value={vehicleId ?? ""} onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : null)} className={inputClass}>
            <option value="">-- Nevybráno --</option>
            {vehicles?.filter((v) => v.isActive).map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.licensePlate ? ` (${v.licensePlate})` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      {type === "kaceni" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="trees">Počet stromů</label>
            <input id="trees" type="number" min="0" value={treesCount} onChange={(e) => setTreesCount(e.target.value)} className={inputClass} placeholder="0" />
          </div>
          <div>
            <label className={labelClass} htmlFor="volume">Objem (m³)</label>
            <input id="volume" type="number" min="0" step="0.01" value={volumeM3} onChange={(e) => setVolumeM3(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        </div>
      )}

      {type === "seceni" && (
        <div>
          <label className={labelClass} htmlFor="area">Plocha (ha)</label>
          <input id="area" type="number" min="0" step="0.001" value={areaHa} onChange={(e) => setAreaHa(e.target.value)} className={inputClass} placeholder="0.0000" />
        </div>
      )}

      <div>
        <label className={labelClass}>Pracovníci</label>
        <div className="border border-border rounded p-3 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {workers?.filter((w) => w.isActive).map((w) => (
            <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={workerIds.includes(w.id)}
                onChange={() => toggleWorker(w.id)}
                className="rounded border-input"
              />
              <span>{w.firstName} {w.lastName}</span>
            </label>
          ))}
          {!workers?.filter((w) => w.isActive).length && (
            <p className="col-span-2 text-muted-foreground text-sm">Žádní aktivní pracovníci</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Stroje</label>
        <div className="border border-border rounded p-3 grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
          {machines?.filter((m) => m.isActive).map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={machineIds.includes(m.id)}
                onChange={() => toggleMachine(m.id)}
                className="rounded border-input"
              />
              <span>{m.name} <span className="text-muted-foreground">({m.type})</span></span>
            </label>
          ))}
          {!machines?.filter((m) => m.isActive).length && (
            <p className="text-muted-foreground text-sm">Žádné aktivní stroje</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="note">Poznámka</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Volitelná poznámka..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isLoading ? "Ukládám..." : "Uložit záznam"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded font-medium text-sm hover:bg-secondary/80 transition-colors"
        >
          Zrušit
        </button>
      </div>
    </form>
  );
}
