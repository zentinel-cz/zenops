import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMowingRecordsQueryKey,
  useCreateMowingRecord,
  useListMowingRecords,
  useUpdateMowingRecord,
  type MowingRecord,
} from "@workspace/api-client-react";
import ManualMowingForm, { type ManualMowingOptionData } from "@/components/ManualMowingForm";
import type { MowingFormData } from "@/components/MowingForm";

const panelClass = "rounded-[1.7rem] border border-white/75 bg-white/90 p-5 shadow-[0_18px_45px_rgba(11,36,56,0.09)] backdrop-blur-xl sm:p-6";

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("cs-CZ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });
}

function recordToForm(record: MowingRecord): Partial<MowingFormData> {
  return {
    date: record.date.slice(0, 10), regionId: record.regionId, workType: record.workType ?? null,
    mowingSection: record.mowingSection ?? null, mowingKind: record.mowingKind ?? null,
    manualMowingKind: "core", contractorCompanyId: null, location: record.location ?? null,
    startTime: record.startTime ?? null, endTime: record.endTime ?? null,
    weatherTypeId: record.weatherTypeId ?? null, weatherTypeIds: record.weatherTypeIds ?? [],
    temperature: record.temperature ?? null, vehicleId: record.vehicleId ?? null,
    vehicleEntries: record.vehicleEntries ?? [], mthStart: record.mthStart ?? null,
    mthEnd: record.mthEnd ?? null, mthTotal: record.mthTotal ?? null,
    fuelConsumption: record.fuelConsumption ?? null, refueling: record.refueling ?? null,
    workerIds: record.workerIds, manualWorkerIds: record.manualWorkerIds ?? [], machineWorkerIds: [],
    workerTimeEntries: record.workerTimeEntries ?? [], machineIds: [], machineMthEntries: [], accessoryIds: [],
    assignedAverage: record.assignedAverage ?? null, dayHours: record.dayHours ?? null,
    nightHours: record.nightHours ?? null, laborHours: record.laborHours ?? null,
    vehicleKmStart: record.vehicleKmStart ?? null, vehicleKmEnd: record.vehicleKmEnd ?? null,
    vehicleKmTotal: record.vehicleKmTotal ?? null, vehicleRefueling: record.vehicleRefueling ?? null,
    brushcutterRefueling: record.brushcutterRefueling ?? null, trafficMarking: record.trafficMarking ?? null,
    note: record.note ?? null,
  };
}

export default function CoreWorkerMowingWorkflow({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: records = [], isLoading } = useListMowingRecords(undefined, { query: { queryKey: getListMowingRecordsQueryKey(), staleTime: 0, refetchOnMount: "always" } });
  const createMutation = useCreateMowingRecord();
  const updateMutation = useUpdateMowingRecord();
  const [options, setOptions] = useState<ManualMowingOptionData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MowingRecord | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/team-daily-records/options", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Číselníky se nepodařilo načíst");
        return payload as ManualMowingOptionData;
      })
      .then(setOptions)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Číselníky se nepodařilo načíst"));
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListMowingRecordsQueryKey() });
  const submit = async (data: MowingFormData) => {
    try {
      setError("");
      setSuccess("");
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        setSuccess("Kmenový denní záznam byl upraven.");
      } else {
        await createMutation.mutateAsync({ data });
        setSuccess("Kmenový denní záznam byl uložen.");
      }
      setEditing(null);
      setShowForm(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Záznam se nepodařilo uložit");
    }
  };

  if ((showForm || editing) && options) {
    return <div className="w-full space-y-4">
      <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">← Zpět na moje záznamy</button>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}
      <ManualMowingForm
        coreWorkerMode
        optionData={options}
        initialData={editing ? recordToForm(editing) : { manualMowingKind: "core" }}
        onSubmit={submit}
        onCancel={() => { setShowForm(false); setEditing(null); }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>;
  }

  return <section className="w-full space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Křováci · Kmenoví</p><h1 className="mt-1 font-display text-3xl font-bold text-slate-950">Moje denní záznamy</h1><p className="mt-2 text-sm text-slate-500">Směna, lokalita, počasí, křovinořezy a jízdy aut.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700">← Druhy práce</button><button type="button" disabled={!options} onClick={() => { setShowForm(true); setError(""); setSuccess(""); }} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-40">+ Nový záznam</button></div>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}
    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{success}</div>}
    <div className={panelClass}>
      {isLoading ? <p className="text-sm text-slate-500">Načítám záznamy…</p> : records.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Zatím nemáte žádný kmenový denní záznam.</p> : <div className="space-y-3">{records.map((record) => {
        const shift = record.workerTimeEntries[0];
        return <article key={record.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-950">{formatDate(record.date)} · {record.region.name}</p><p className="mt-1 text-sm text-slate-600">{record.location || "Místo neuvedeno"}{shift?.startTime && shift?.endTime ? ` · ${shift.startTime}–${shift.endTime}` : ""}{record.vehicleEntries.length ? ` · ${record.vehicleEntries.length} jízd` : ""}</p><p className="mt-1 text-xs text-slate-400">Vytvořeno {formatDateTime(record.createdAt)}</p></div><button type="button" onClick={() => { setEditing(record); setError(""); setSuccess(""); }} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Upravit</button></article>;
      })}</div>}
    </div>
  </section>;
}
