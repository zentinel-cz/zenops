import { useMemo, useState } from "react";
import { todayISO } from "@/lib/utils";
import type { ManualMowingOptionData } from "@/components/ManualMowingForm";

export type CoreVehicleEntry = { vehicleId: number; kmStart: number | null; kmEnd: number | null; kmTotal: number | null; refueling: number | null; vehicle?: { name: string; licensePlate?: string | null } | null };

export type CoreMowingPayload = {
  date: string;
  regionId: number;
  location: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  coreWorkType: string;
  performanceValue: number | null;
  performanceUnit: string | null;
  machineId: number | null;
  mthStart: number | null;
  mthEnd: number | null;
  fuelConsumption: number | null;
  brushcutterRefueling: number | null;
  serviceNote: string | null;
  vehicleEntries: CoreVehicleEntry[];
  note: string | null;
};

export type CoreMowingRecord = CoreMowingPayload & {
  id: number;
  userId: number;
  coreStatus: "draft" | "submitted" | "approved" | null;
  coreSubmittedAt?: string | null;
  coreApprovedAt?: string | null;
  laborHours?: number | null;
  performanceValue: number | null;
  createdAt: string;
  updatedAt: string;
  region: { id: number; name: string };
  user: { id: number; fullName: string };
  workers: Array<{ id: number; firstName: string; lastName: string }>;
  machines: Array<{ id: number; name: string; mowingCategory?: string | null }>;
  vehicleEntries: CoreVehicleEntry[];
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
const labelClass = "mb-2 block text-sm font-bold text-slate-700";
const sectionClass = "rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(11,36,56,0.08)] sm:p-6";

const workTypes = [
  ["vyzinani", "Vyžínání"],
  ["seceni_burene", "Sečení buřeně"],
  ["cisteni_porostu", "Čištění porostu"],
  ["udrzba_cest", "Údržba cest"],
  ["ostatni", "Ostatní"],
] as const;

function numberValue(value: string): number | null {
  return value === "" ? null : Number(value);
}

function calculateHours(start: string, end: string, breakMinutes: number) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  minutes -= breakMinutes;
  return minutes > 0 ? Math.round((minutes / 60) * 100) / 100 : null;
}

export default function CoreMowingForm({ initial, options, managerMode, onSubmit, onCancel, loading }: {
  initial?: CoreMowingRecord | null;
  options: ManualMowingOptionData;
  managerMode: boolean;
  onSubmit: (payload: CoreMowingPayload) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? todayISO());
  const [regionId, setRegionId] = useState(initial?.regionId ?? 0);
  const [location, setLocation] = useState(initial?.location ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "16:00");
  const [breakMinutes, setBreakMinutes] = useState(initial?.breakMinutes ?? 30);
  const [coreWorkType, setCoreWorkType] = useState(initial?.coreWorkType ?? "");
  const [performanceValue, setPerformanceValue] = useState(initial?.performanceValue != null ? String(initial.performanceValue) : "");
  const [performanceUnit, setPerformanceUnit] = useState(initial?.performanceUnit ?? "ha");
  const [machineId, setMachineId] = useState(initial?.machines?.[0]?.id ?? 0);
  const [mthStart, setMthStart] = useState(initial?.mthStart != null ? String(initial.mthStart) : "");
  const [mthEnd, setMthEnd] = useState(initial?.mthEnd != null ? String(initial.mthEnd) : "");
  const [fuelConsumption, setFuelConsumption] = useState(initial?.fuelConsumption != null ? String(initial.fuelConsumption) : "");
  const [refueling, setRefueling] = useState(initial?.brushcutterRefueling != null ? String(initial.brushcutterRefueling) : "");
  const [serviceNote, setServiceNote] = useState(initial?.serviceNote ?? "");
  const [vehicleEntries, setVehicleEntries] = useState<CoreVehicleEntry[]>(initial?.vehicleEntries ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  const brushcutters = (options.machines ?? []).filter((machine) => machine.isActive !== false && machine.mowingCategory === "brushcutter");
  const vehicles = options.vehicles.filter((vehicle) => vehicle.isActive !== false);
  const regions = options.regions.filter((region) => region.isActive !== false);
  const hours = useMemo(() => calculateHours(startTime, endTime, breakMinutes), [startTime, endTime, breakMinutes]);
  const owner = initial?.workers?.[0] ?? options.workers[0];

  const updateVehicle = (index: number, field: keyof CoreVehicleEntry, raw: string) => {
    setVehicleEntries((items) => items.map((entry, entryIndex) => {
      if (entryIndex !== index) return entry;
      const value = numberValue(raw);
      const next = { ...entry, [field]: field === "vehicleId" ? value ?? 0 : value };
      const total = next.kmStart != null && next.kmEnd != null && next.kmEnd >= next.kmStart ? Math.round((next.kmEnd - next.kmStart) * 100) / 100 : null;
      return { ...next, kmTotal: total };
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!date || !regionId || !location.trim() || !startTime || !endTime || !coreWorkType) { setError("Vyplňte datum, revír, místo, pracovní dobu a druh práce."); return; }
    if (hours == null) { setError("Pracovní doba po odečtení přestávky musí být delší než nula."); return; }
    if (performanceValue && !performanceUnit) { setError("Vyberte jednotku výkonu."); return; }
    if (mthStart && mthEnd && Number(mthEnd) < Number(mthStart)) { setError("Konečný stav motohodin nesmí být nižší než počáteční."); return; }
    if (vehicleEntries.some((entry) => !entry.vehicleId || (entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart))) { setError("Doplňte platné údaje všech jízd."); return; }
    await onSubmit({
      date, regionId, location: location.trim(), startTime, endTime, breakMinutes, coreWorkType,
      performanceValue: numberValue(performanceValue), performanceUnit: performanceValue ? performanceUnit : null,
      machineId: machineId || null, mthStart: numberValue(mthStart), mthEnd: numberValue(mthEnd),
      fuelConsumption: numberValue(fuelConsumption), brushcutterRefueling: numberValue(refueling),
      serviceNote: serviceNote.trim() || null, vehicleEntries, note: note.trim() || null,
    });
  };

  return <form onSubmit={submit} className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Křováci · Kmenoví</p><h1 className="mt-1 text-2xl font-black text-slate-950">{initial ? "Upravit denní záznam" : "Nový denní záznam"}</h1></div><button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">← Zpět</button></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

    <section className={sectionClass}><h2 className="mb-4 text-lg font-black">Základní údaje</h2><div className="grid gap-4 sm:grid-cols-2">
      <div><label className={labelClass}>Datum *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>Křovák</label><input readOnly value={owner ? `${owner.firstName} ${owner.lastName}` : "Podle přihlášeného účtu"} className={`${inputClass} bg-slate-100`} /></div>
      <div><label className={labelClass}>Revír *</label><select value={regionId || ""} onChange={(e) => setRegionId(Number(e.target.value))} className={inputClass}><option value="">Vyberte revír</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></div>
      <div><label className={labelClass}>Místo zakázky / lokalita *</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Oddělení, porost nebo lokalita" /></div>
    </div></section>

    <section className={sectionClass}><h2 className="mb-4 text-lg font-black">Pracovní doba</h2><div className="grid gap-4 sm:grid-cols-3">
      <div><label className={labelClass}>Začátek *</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>Konec *</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>Přestávka (min)</label><input type="number" min="0" step="5" value={breakMinutes} onChange={(e) => setBreakMinutes(Math.max(0, Number(e.target.value)))} className={inputClass} /></div>
    </div><p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Odpracováno: {hours != null ? `${hours} hod.` : "—"}</p></section>

    <section className={sectionClass}><h2 className="mb-4 text-lg font-black">Provedená práce</h2><div className="grid gap-4 sm:grid-cols-2">
      <div><label className={labelClass}>Druh práce *</label><select value={coreWorkType} onChange={(e) => setCoreWorkType(e.target.value)} className={inputClass}><option value="">Vyberte druh práce</option>{workTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div><label className={labelClass}>Výkon / plocha</label><div className="grid grid-cols-[1fr_7rem] gap-2"><input type="number" min="0" step="0.01" value={performanceValue} onChange={(e) => setPerformanceValue(e.target.value)} className={inputClass} placeholder="Hodnota" /><select value={performanceUnit} onChange={(e) => setPerformanceUnit(e.target.value)} className={inputClass}><option value="ha">ha</option><option value="m2">m²</option><option value="hod">hod.</option></select></div></div>
      <div className="sm:col-span-2"><label className={labelClass}>Poznámka k práci</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} /></div>
    </div></section>

    <section className={sectionClass}><h2 className="mb-4 text-lg font-black">Křovinořez a palivo</h2><div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className={labelClass}>Použitý křovinořez</label><select value={machineId || ""} onChange={(e) => setMachineId(Number(e.target.value))} className={inputClass}><option value="">Bez výběru</option>{brushcutters.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select>{!brushcutters.length && <p className="mt-2 text-xs text-amber-700">V číselníku zatím není žádný stroj zařazený jako Křovinořez.</p>}</div>
      <div><label className={labelClass}>MTH začátek</label><input type="number" min="0" step="0.1" value={mthStart} onChange={(e) => setMthStart(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>MTH konec</label><input type="number" min="0" step="0.1" value={mthEnd} onChange={(e) => setMthEnd(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>Spotřeba paliva (l)</label><input type="number" min="0" step="0.1" value={fuelConsumption} onChange={(e) => setFuelConsumption(e.target.value)} className={inputClass} /></div>
      <div><label className={labelClass}>Tankování (l)</label><input type="number" min="0" step="0.1" value={refueling} onChange={(e) => setRefueling(e.target.value)} className={inputClass} /></div>
      <div className="sm:col-span-2"><label className={labelClass}>Závada / servisní poznámka</label><textarea value={serviceNote} onChange={(e) => setServiceNote(e.target.value)} rows={2} className={inputClass} /></div>
    </div></section>

    <section className={sectionClass}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">Doprava <span className="text-sm font-medium text-slate-400">(volitelně)</span></h2><button type="button" onClick={() => setVehicleEntries((items) => [...items, { vehicleId: 0, kmStart: null, kmEnd: null, kmTotal: null, refueling: null }])} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">+ Přidat jízdu</button></div>
      <div className="space-y-3">{vehicleEntries.map((entry, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex justify-between"><b>Jízda {index + 1}</b><button type="button" onClick={() => setVehicleEntries((items) => items.filter((_, i) => i !== index))} className="text-sm font-bold text-red-600">Odebrat</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select value={entry.vehicleId || ""} onChange={(e) => updateVehicle(index, "vehicleId", e.target.value)} className={inputClass}><option value="">Vyberte vozidlo</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ""}</option>)}</select><input type="number" min="0" step="0.1" placeholder="Km začátek" value={entry.kmStart ?? ""} onChange={(e) => updateVehicle(index, "kmStart", e.target.value)} className={inputClass} /><input type="number" min="0" step="0.1" placeholder="Km konec" value={entry.kmEnd ?? ""} onChange={(e) => updateVehicle(index, "kmEnd", e.target.value)} className={inputClass} /><input readOnly placeholder="Km celkem" value={entry.kmTotal ?? ""} className={`${inputClass} bg-slate-100`} /><input type="number" min="0" step="0.1" placeholder="Tankování (l)" value={entry.refueling ?? ""} onChange={(e) => updateVehicle(index, "refueling", e.target.value)} className={inputClass} /></div></div>)}</div>
    </section>

    <div className="sticky bottom-3 flex gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-xl backdrop-blur"><button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold">Zrušit</button><button type="submit" disabled={loading} className="flex-[2] rounded-xl bg-emerald-700 px-4 py-3 font-black text-white disabled:opacity-50">{loading ? "Ukládám…" : managerMode ? "Uložit opravu" : "Uložit rozpracovaný záznam"}</button></div>
  </form>;
}
