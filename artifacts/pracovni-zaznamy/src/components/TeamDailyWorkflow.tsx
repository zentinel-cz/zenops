import { useEffect, useMemo, useState } from "react";

type Option = { id: number; name: string; code?: string | null; icon?: string | null; type?: string | null; licensePlate?: string | null; defaultAccessoryId?: number | null };
type Worker = { id: number; firstName: string; lastName: string };
type Assignment = { workerId: number; firstName: string; lastName: string };
type Options = { regions: Option[]; weatherTypes: Option[]; machines: Option[]; accessories: Option[]; vehicles: Option[]; workers: Worker[] };
type DailyRecord = { id: number; date: string; regionId: number; location: string | null; weatherTypeId: number | null; temperature: number | null; status: "draft" | "open" | "closed"; createdAt: string };
type MachineEntry = { machineId: number | ""; accessoryId: number | ""; mthStart: number | ""; mthEnd: number | ""; mthTotal?: number | null; fuelConsumption: number | ""; refueling: number | "" };
type VehicleEntry = { vehicleId: number | ""; kmStart: number | ""; kmEnd: number | ""; kmTotal?: number | null; refueling: number | "" };
type EmployeeEntry = { id: number; workerId: number; fullName: string; machineEntries: MachineEntry[]; vehicleEntries: VehicleEntry[]; note: string | null; updatedAt: string };
type Detail = DailyRecord & { region: Option | null; weather: Option | null; creator: { id: number; fullName: string } | null; assignments: Assignment[]; entries: EmployeeEntry[]; myWorkerId: number | null };

const panelClass = "rounded-[1.6rem] border border-white/75 bg-white/88 p-5 shadow-[0_18px_45px_rgba(11,36,56,0.09)] backdrop-blur-xl sm:p-6";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Požadavek se nepodařilo dokončit");
  return payload as T;
}

function statusLabel(status: DailyRecord["status"]) {
  return status === "draft" ? "Rozpracovaný" : status === "open" ? "Otevřený" : "Uzavřený";
}

function statusClass(status: DailyRecord["status"]) {
  return status === "open" ? "bg-emerald-100 text-emerald-800" : status === "closed" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800";
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("cs-CZ");
}

function RecordHeading({ record, options }: { record: DailyRecord; options: Options | null }) {
  const region = options?.regions.find((item) => item.id === record.regionId);
  const weather = options?.weatherTypes.find((item) => item.id === record.weatherTypeId);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-bold text-slate-950">{formatDate(record.date)} · {region?.name ?? "Revír"}</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(record.status)}`}>{statusLabel(record.status)}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{record.location || "Místo neuvedeno"}{weather ? ` · ${weather.icon ?? ""} ${weather.name}` : ""}{record.temperature != null ? ` · ${record.temperature} °C` : ""}</p>
    </div>
  );
}

export function ManagerDailyWorkflow() {
  const [options, setOptions] = useState<Options | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    regionId: "",
    location: "",
    weatherTypeId: "",
    temperature: "",
    workerIds: [] as number[],
    status: "open" as "draft" | "open",
  });

  const refresh = async (archive = showArchive) => {
    const [nextOptions, nextRecords] = await Promise.all([
      api<Options>("/api/team-daily-records/options"),
      api<DailyRecord[]>(`/api/team-daily-records${archive ? "?archive=1" : ""}`),
    ]);
    setOptions(nextOptions);
    setRecords(nextRecords);
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id: number) => {
    try {
      setError("");
      setDetail(await api<Detail>(`/api/team-daily-records/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Záznam nelze načíst");
    }
  };

  const toggleWorker = (workerId: number) => setForm((current) => ({
    ...current,
    workerIds: current.workerIds.includes(workerId) ? current.workerIds.filter((id) => id !== workerId) : [...current.workerIds, workerId],
  }));

  const createRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const created = await api<DailyRecord>("/api/team-daily-records", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          regionId: Number(form.regionId),
          weatherTypeId: form.weatherTypeId ? Number(form.weatherTypeId) : null,
          temperature: form.temperature === "" ? null : Number(form.temperature),
        }),
      });
      await refresh(false);
      setShowCreate(false);
      setForm({ date: new Date().toISOString().slice(0, 10), regionId: "", location: "", weatherTypeId: "", temperature: "", workerIds: [], status: "open" });
      await loadDetail(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Záznam nelze vytvořit");
    }
  };

  const changeStatus = async (status: DailyRecord["status"]) => {
    if (!detail) return;
    try {
      await api(`/api/team-daily-records/${detail.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setDetail(null);
      await refresh(showArchive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stav nelze změnit");
    }
  };

  const machineName = (id: number | "") => options?.machines.find((item) => item.id === id)?.name ?? `Stroj #${id}`;
  const vehicleName = (id: number | "") => options?.vehicles.find((item) => item.id === id)?.name ?? `Auto #${id}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Vedoucí · Ovečky</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-950">Denní záznamy týmu</h1>
          <p className="mt-2 text-sm text-slate-500">Připravte místo a podmínky, zaměstnanci následně doplní svou techniku.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { const next = !showArchive; setShowArchive(next); setDetail(null); setShowCreate(false); void refresh(next); }} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            {showArchive ? "← Aktivní záznamy" : "Archiv uzavřených"}
          </button>
          {!showArchive && <button type="button" onClick={() => { setShowCreate((value) => !value); setDetail(null); }} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800">
            {showCreate ? "Zavřít formulář" : "+ Nový denní záznam"}
          </button>}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

      {showCreate && options && (
        <form onSubmit={createRecord} className={panelClass}>
          <h2 className="font-display text-xl font-bold">Nový záznam Ovečky</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass}>Datum *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} required /></div>
            <div><label className={labelClass}>Revír *</label><select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} className={inputClass} required><option value="">-- Vyberte revír --</option>{options.regions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <div className="sm:col-span-2"><label className={labelClass}>Místo práce</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} placeholder="Lokalita, úsek nebo zakázka" /></div>
            <div><label className={labelClass}>Počasí</label><select value={form.weatherTypeId} onChange={(e) => setForm({ ...form, weatherTypeId: e.target.value })} className={inputClass}><option value="">-- Vyberte počasí --</option>{options.weatherTypes.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.name}</option>)}</select></div>
            <div><label className={labelClass}>Teplota °C</label><input type="number" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className={inputClass} /></div>
          </div>
          <div className="mt-5">
            <label className={labelClass}>Zaměstnanci na záznamu *</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.workers.map((worker) => {
                const checked = form.workerIds.includes(worker.id);
                return <label key={worker.id} className={`cursor-pointer rounded-xl border p-3 text-sm font-medium transition-colors ${checked ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-700"}`}><input type="checkbox" checked={checked} onChange={() => toggleWorker(worker.id)} className="mr-2" />{worker.firstName} {worker.lastName}</label>;
              })}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="radio" checked={form.status === "open"} onChange={() => setForm({ ...form, status: "open" })} /> Ihned otevřít zaměstnancům</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="radio" checked={form.status === "draft"} onChange={() => setForm({ ...form, status: "draft" })} /> Uložit jako rozpracovaný</label>
          </div>
          <button type="submit" className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Vytvořit denní záznam</button>
        </form>
      )}

      {detail && (
        <section className={panelClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <RecordHeading record={detail} options={options} />
            <div className="flex flex-wrap gap-2">
              {detail.status !== "open" && <button onClick={() => void changeStatus("open")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Otevřít</button>}
              {detail.status !== "closed" && <button onClick={() => void changeStatus("closed")} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">Uzavřít</button>}
              <button onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">Zpět</button>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {detail.assignments.map((worker) => {
              const workerId = worker.workerId;
              const entry = detail.entries.find((item) => item.workerId === workerId);
              return (
                <div key={workerId} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{worker.firstName} {worker.lastName}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{entry ? "Zápis uložen" : "Čeká na zápis"}</span>
                  </div>
                  {entry && <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Stroje</p>{entry.machineEntries.map((item, index) => <p key={index} className="mt-1 text-sm text-slate-700">{machineName(item.machineId)} · MTH {item.mthStart}–{item.mthEnd} ({item.mthTotal ?? Number(item.mthEnd) - Number(item.mthStart)})</p>)}</div>
                    <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Auta</p>{entry.vehicleEntries.length ? entry.vehicleEntries.map((item, index) => <p key={index} className="mt-1 text-sm text-slate-700">{vehicleName(item.vehicleId)} · {item.kmStart}–{item.kmEnd} km</p>) : <p className="mt-1 text-sm text-slate-500">Bez auta</p>}</div>
                    {entry.note && <p className="text-sm text-slate-600 md:col-span-2">{entry.note}</p>}
                  </div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!detail && !showCreate && (
        <section className="grid gap-3">
          {loading ? <div className={panelClass}>Načítám záznamy…</div> : records.length === 0 ? <div className={panelClass}>{showArchive ? "Archiv zatím neobsahuje žádné uzavřené záznamy." : "Zatím nejsou vytvořené žádné aktivní týmové denní záznamy."}</div> : records.map((record) => (
            <button key={record.id} type="button" onClick={() => void loadDetail(record.id)} className={`${panelClass} flex w-full items-center justify-between gap-4 text-left transition-transform hover:-translate-y-0.5`}>
              <RecordHeading record={record} options={options} /><span className="text-xl text-slate-400">→</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function emptyMachine(): MachineEntry {
  return { machineId: "", accessoryId: "", mthStart: "", mthEnd: "", fuelConsumption: "", refueling: "" };
}

function emptyVehicle(): VehicleEntry {
  return { vehicleId: "", kmStart: "", kmEnd: "", refueling: "" };
}

export function EmployeeDailyWorkflow({ onBack }: { onBack: () => void }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [machineEntries, setMachineEntries] = useState<MachineEntry[]>([emptyMachine()]);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api<Options>("/api/team-daily-records/options"), api<DailyRecord[]>("/api/team-daily-records")])
      .then(([nextOptions, nextRecords]) => { setOptions(nextOptions); setRecords(nextRecords); })
      .catch((err) => setError(err.message));
  }, []);

  const switchArchive = async () => {
    const next = !showArchive;
    setShowArchive(next);
    setDetail(null);
    setError("");
    try {
      setRecords(await api<DailyRecord[]>(`/api/team-daily-records${next ? "?archive=1" : ""}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Záznamy nelze načíst");
    }
  };

  const openRecord = async (id: number) => {
    try {
      setError("");
      setSaved(false);
      const next = await api<Detail>(`/api/team-daily-records/${id}`);
      setDetail(next);
      const entry = next.entries[0];
      setMachineEntries(entry?.machineEntries?.length ? entry.machineEntries : [emptyMachine()]);
      setVehicleEntries(entry?.vehicleEntries ?? []);
      setNote(entry?.note ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Záznam nelze otevřít");
    }
  };

  const updateMachine = (index: number, field: keyof MachineEntry, value: number | "") => {
    setMachineEntries((items) => items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === "machineId" && value !== "") next.accessoryId = options?.machines.find((machine) => machine.id === value)?.defaultAccessoryId ?? "";
      return next;
    }));
  };
  const updateVehicle = (index: number, field: keyof VehicleEntry, value: number | "") => setVehicleEntries((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const numericValue = (value: string) => value === "" ? "" : Number(value);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    try {
      setError("");
      await api(`/api/team-daily-records/${detail.id}/my-entry`, { method: "PUT", body: JSON.stringify({ machineEntries, vehicleEntries, note }) });
      setSaved(true);
      await openRecord(detail.id);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zápis nelze uložit");
    }
  };

  const readonly = detail?.status === "closed";

  if (!detail) return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ovečky</p><h1 className="mt-1 font-display text-3xl font-bold">Moje denní záznamy</h1><p className="mt-2 text-sm text-slate-500">Vyberte záznam připravený vedoucím.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void switchArchive()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">{showArchive ? "← Aktivní záznamy" : "Archiv uzavřených"}</button><button onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">← Zpět</button></div>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-3">
        {records.length === 0 ? <div className={panelClass}>{showArchive ? "Archiv neobsahuje žádné uzavřené záznamy." : "Vedoucí vám zatím nepřiřadil žádný otevřený denní záznam."}</div> : records.map((record) => (
          <button key={record.id} onClick={() => void openRecord(record.id)} className={`${panelClass} flex items-center justify-between gap-4 text-left`}><RecordHeading record={record} options={options} /><span className="text-xl text-slate-400">→</span></button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <div className={panelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><RecordHeading record={detail} options={options} /><button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold">← Seznam záznamů</button></div>
        <p className="mt-4 text-sm text-slate-500">Vedoucí: {detail.creator?.fullName ?? "—"}</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Váš zápis byl uložen.</div>}
      {readonly && <div className="rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm font-medium text-slate-700">Vedoucí tento záznam uzavřel. Údaje už nelze měnit.</div>}

      <section className={panelClass}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Moje technika</p><h2 className="mt-1 font-display text-xl font-bold">Stroje a motohodiny</h2></div>{!readonly && <button type="button" onClick={() => setMachineEntries((items) => [...items, emptyMachine()])} className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary">+ Přidat stroj</button>}</div>
        <div className="mt-4 space-y-4">
          {machineEntries.map((entry, index) => {
            const total = entry.mthStart !== "" && entry.mthEnd !== "" ? Math.round((Number(entry.mthEnd) - Number(entry.mthStart)) * 100) / 100 : null;
            return <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><b>Stroj #{index + 1}</b>{!readonly && machineEntries.length > 1 && <button type="button" onClick={() => setMachineEntries((items) => items.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600">Odebrat</button>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><label className={labelClass}>Stroj *</label><select disabled={readonly} value={entry.machineId} onChange={(e) => updateMachine(index, "machineId", numericValue(e.target.value))} className={inputClass} required><option value="">-- Vyberte stroj --</option>{options?.machines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div><label className={labelClass}>Příslušenství</label><select disabled={readonly} value={entry.accessoryId} onChange={(e) => updateMachine(index, "accessoryId", numericValue(e.target.value))} className={inputClass}><option value="">Bez příslušenství</option>{options?.accessories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div><label className={labelClass}>MTH začátek *</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.mthStart} onChange={(e) => updateMachine(index, "mthStart", numericValue(e.target.value))} className={inputClass} required /></div>
              <div><label className={labelClass}>MTH konec *</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.mthEnd} onChange={(e) => updateMachine(index, "mthEnd", numericValue(e.target.value))} className={inputClass} required /></div>
              <div><label className={labelClass}>Rozdíl MTH</label><div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm font-bold">{total ?? "—"}</div></div>
              <div><label className={labelClass}>Spotřeba</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.fuelConsumption} onChange={(e) => updateMachine(index, "fuelConsumption", numericValue(e.target.value))} className={inputClass} /></div>
              <div><label className={labelClass}>Tankování</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.refueling} onChange={(e) => updateMachine(index, "refueling", numericValue(e.target.value))} className={inputClass} /></div>
            </div></div>;
          })}
        </div>
      </section>

      <section className={panelClass}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Doprava</p><h2 className="mt-1 font-display text-xl font-bold">Auta a kilometry</h2></div>{!readonly && <button type="button" onClick={() => setVehicleEntries((items) => [...items, emptyVehicle()])} className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold text-primary">+ Přidat auto</button>}</div>
        {vehicleEntries.length === 0 ? <p className="mt-4 text-sm text-slate-500">Bez auta. Pokud jste auto použili, přidejte ho tlačítkem výše.</p> : <div className="mt-4 space-y-4">{vehicleEntries.map((entry, index) => {
          const total = entry.kmStart !== "" && entry.kmEnd !== "" ? Math.round((Number(entry.kmEnd) - Number(entry.kmStart)) * 100) / 100 : null;
          return <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><b>Auto #{index + 1}</b>{!readonly && <button type="button" onClick={() => setVehicleEntries((items) => items.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600">Odebrat</button>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className={labelClass}>Auto *</label><select disabled={readonly} value={entry.vehicleId} onChange={(e) => updateVehicle(index, "vehicleId", numericValue(e.target.value))} className={inputClass} required><option value="">-- Vyberte auto --</option>{options?.vehicles.map((item) => <option key={item.id} value={item.id}>{item.name}{item.licensePlate ? ` (${item.licensePlate})` : ""}</option>)}</select></div>
            <div><label className={labelClass}>Km začátek *</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.kmStart} onChange={(e) => updateVehicle(index, "kmStart", numericValue(e.target.value))} className={inputClass} required /></div>
            <div><label className={labelClass}>Km konec *</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.kmEnd} onChange={(e) => updateVehicle(index, "kmEnd", numericValue(e.target.value))} className={inputClass} required /></div>
            <div><label className={labelClass}>Celkem km</label><div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 text-sm font-bold">{total ?? "—"}</div></div>
            <div><label className={labelClass}>Tankování</label><input disabled={readonly} type="number" step="0.01" min="0" value={entry.refueling} onChange={(e) => updateVehicle(index, "refueling", numericValue(e.target.value))} className={inputClass} /></div>
          </div></div>;
        })}</div>}
      </section>

      <section className={panelClass}><label className={labelClass}>Moje poznámka</label><textarea disabled={readonly} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} min-h-24`} /></section>
      {!readonly && <button type="submit" className="w-full rounded-xl bg-slate-900 px-5 py-4 text-base font-bold text-white shadow-lg hover:bg-slate-800">Uložit můj zápis</button>}
    </form>
  );
}
