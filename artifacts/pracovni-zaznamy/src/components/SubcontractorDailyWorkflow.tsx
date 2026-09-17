import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListSubcontractorDailyRecordsQueryKey,
  useCreateSubcontractorDailyRecord,
  useListSubcontractorDailyRecords,
  useUpdateSubcontractorDailyRecord,
  type SubcontractorDailyRecord,
  type UpsertSubcontractorDailyRecordBody,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { exportSubcontractorDailyExcel } from "@/lib/exportExcel";

const panelClass = "rounded-[1.6rem] border border-white/75 bg-white/90 p-5 shadow-[0_18px_45px_rgba(11,36,56,0.09)] backdrop-blur-xl sm:p-6";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): UpsertSubcontractorDailyRecordBody {
  return { date: today(), location: "", workerCount: 1, startTime: "07:00", endTime: "15:30" };
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("cs-CZ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });
}

function durationHours(record: Pick<SubcontractorDailyRecord, "startTime" | "endTime">) {
  const [startHour, startMinute] = record.startTime.split(":").map(Number);
  const [endHour, endMinute] = record.endTime.split(":").map(Number);
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Požadavek se nepodařilo dokončit";
}

function RecordForm({
  value,
  title,
  pending,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: UpsertSubcontractorDailyRecordBody;
  title: string;
  pending: boolean;
  onChange: (value: UpsertSubcontractorDailyRecordBody) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className={panelClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-slate-950">{title}</h2>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Zrušit</button>}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label className={labelClass}>Datum *</label><input type="date" required value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Počet lidí na zakázce *</label><input type="number" required min={1} max={1000} value={value.workerCount} onChange={(event) => onChange({ ...value, workerCount: Number(event.target.value) })} className={inputClass} /></div>
        <div className="sm:col-span-2"><label className={labelClass}>Místo zakázky *</label><input required maxLength={255} value={value.location} onChange={(event) => onChange({ ...value, location: event.target.value })} className={inputClass} placeholder="Název zakázky, obec nebo přesná lokalita" /></div>
        <div><label className={labelClass}>Práce od *</label><input type="time" required value={value.startTime} onChange={(event) => onChange({ ...value, startTime: event.target.value })} className={inputClass} /></div>
        <div><label className={labelClass}>Práce do *</label><input type="time" required value={value.endTime} onChange={(event) => onChange({ ...value, endTime: event.target.value })} className={inputClass} /></div>
      </div>
      <button type="submit" disabled={pending} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Ukládám…" : "Uložit denní záznam"}</button>
    </form>
  );
}

export function SubcontractorPortal() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<UpsertSubcontractorDailyRecordBody>(emptyForm());
  const [editing, setEditing] = useState<SubcontractorDailyRecord | null>(null);
  const [editForm, setEditForm] = useState<UpsertSubcontractorDailyRecordBody>(emptyForm());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { data: records = [], isLoading } = useListSubcontractorDailyRecords({ month });
  const createMutation = useCreateSubcontractorDailyRecord();
  const updateMutation = useUpdateSubcontractorDailyRecord();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSubcontractorDailyRecordsQueryKey() });
  const createRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      await createMutation.mutateAsync({ data: form });
      setForm(emptyForm());
      setSuccess("Denní záznam byl uložen.");
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const startEdit = (record: SubcontractorDailyRecord) => {
    setEditing(record);
    setEditForm({ date: record.date.slice(0, 10), location: record.location, workerCount: record.workerCount, startTime: record.startTime, endTime: record.endTime });
    setError("");
    setSuccess("");
  };
  const updateRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      setError("");
      await updateMutation.mutateAsync({ id: editing.id, data: editForm });
      setEditing(null);
      setSuccess("Denní záznam byl upraven.");
      await refresh();
    } catch (error) {
      setError(errorMessage(error));
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#d9f7ee,_transparent_38%),linear-gradient(135deg,#f8fbfa,#eaf2f6)] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-4 rounded-[1.8rem] bg-slate-950 px-6 py-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">ZenOps · Subdodavatel</p><h1 className="mt-1 font-display text-3xl font-bold">Denní záznamy sečení</h1><p className="mt-1 text-sm text-slate-300">{user?.fullName}</p></div>
          <button type="button" onClick={() => void logout()} className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold hover:bg-white/10">Odhlásit se</button>
        </header>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Tento účet má přístup pouze k denním záznamům své subdodavatelské firmy.</div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{success}</div>}
        {editing ? <RecordForm value={editForm} onChange={setEditForm} onSubmit={updateRecord} onCancel={() => setEditing(null)} pending={updateMutation.isPending} title={`Upravit záznam #${editing.id}`} /> : <RecordForm value={form} onChange={setForm} onSubmit={createRecord} pending={createMutation.isPending} title="Nový denní záznam" />}
        <section className={panelClass}>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Historie vlastní firmy</p><h2 className="mt-1 font-display text-2xl font-bold">Uložené záznamy</h2></div><div><label className={labelClass}>Měsíc</label><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputClass} /></div></div>
          <div className="mt-5 space-y-3">
            {isLoading ? <p className="text-sm text-slate-500">Načítám záznamy…</p> : records.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">V tomto měsíci zatím není žádný záznam.</p> : records.map((record) => <div key={record.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-950">{formatDate(record.date)} · {record.location}</p><p className="mt-1 text-sm text-slate-600">{record.workerCount} lidí · {record.startTime}–{record.endTime} · {durationHours(record).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} h</p><p className="mt-1 text-xs text-slate-400">Vytvořeno {formatDateTime(record.createdAt)}</p></div><button type="button" onClick={() => startEdit(record)} className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">Upravit</button></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

export function AdminSubcontractorDailyWorkflow() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { data: records = [], isLoading, error } = useListSubcontractorDailyRecords({ month });
  const selectedRecords = useMemo(() => records.filter((record) => selectedIds.includes(record.id)), [records, selectedIds]);
  const totalPeople = records.reduce((sum, record) => sum + record.workerCount, 0);
  const totalPersonHours = records.reduce((sum, record) => sum + durationHours(record) * record.workerCount, 0);
  const allSelected = records.length > 0 && records.every((record) => selectedIds.includes(record.id));
  const toggleAll = () => setSelectedIds(allSelected ? selectedIds.filter((id) => !records.some((record) => record.id === id)) : [...new Set([...selectedIds, ...records.map((record) => record.id)])]);

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Administrace · Subdodavatelé</p><h2 className="mt-1 font-display text-3xl font-bold text-slate-950">Denní záznamy subdodavatelů</h2><p className="mt-2 text-sm text-slate-500">Měsíční kontrola míst, počtu lidí a odpracovaného času. Záznamy vkládají pouze účty přiřazené ke konkrétní firmě.</p></div>
      <section className={panelClass}>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <div><label className={labelClass}>Kontrolovaný měsíc</label><input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSelectedIds([]); }} className={inputClass} /></div>
          <div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-100 p-3"><p className="text-xs text-slate-500">Záznamy</p><b className="text-xl">{records.length}</b></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Lidí celkem</p><b className="text-xl">{totalPeople}</b></div><div className="rounded-xl bg-cyan-50 p-3"><p className="text-xs text-cyan-700">Člověkohodiny</p><b className="text-xl">{totalPersonHours.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</b></div></div>
          <button type="button" disabled={selectedRecords.length === 0} onClick={() => exportSubcontractorDailyExcel(selectedRecords)} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Exportovat vybrané ({selectedRecords.length})</button>
        </div>
        <button type="button" onClick={toggleAll} className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{allSelected ? "Zrušit výběr měsíce" : "Vybrat celý měsíc"}</button>
      </section>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{errorMessage(error)}</div>}
      <section className={panelClass}>
        {isLoading ? <p className="text-sm text-slate-500">Načítám záznamy…</p> : records.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">V tomto měsíci nejsou žádné záznamy subdodavatelů.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-2 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th><th className="px-2 py-3">Datum</th><th className="px-2 py-3">Subdodavatel</th><th className="px-2 py-3">Místo</th><th className="px-2 py-3">Lidé</th><th className="px-2 py-3">Práce</th><th className="px-2 py-3">Člověkohodiny</th><th className="px-2 py-3">Vytvořeno</th></tr></thead><tbody>{records.map((record) => { const checked = selectedIds.includes(record.id); const personHours = durationHours(record) * record.workerCount; return <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-2 py-3"><input type="checkbox" checked={checked} onChange={() => setSelectedIds((ids) => checked ? ids.filter((id) => id !== record.id) : [...ids, record.id])} /></td><td className="whitespace-nowrap px-2 py-3 font-semibold">{formatDate(record.date)}</td><td className="px-2 py-3">{record.companyName ?? `Firma #${record.contractorCompanyId}`}</td><td className="px-2 py-3">{record.location}</td><td className="px-2 py-3">{record.workerCount}</td><td className="whitespace-nowrap px-2 py-3">{record.startTime}–{record.endTime}</td><td className="px-2 py-3 font-semibold">{personHours.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}</td><td className="whitespace-nowrap px-2 py-3 text-xs text-slate-500">{formatDateTime(record.createdAt)}</td></tr>; })}</tbody></table></div>}
      </section>
    </div>
  );
}
