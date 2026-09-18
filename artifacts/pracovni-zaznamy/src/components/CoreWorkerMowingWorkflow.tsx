import { useCallback, useEffect, useState } from "react";
import CoreMowingForm, { type CoreMowingPayload, type CoreMowingRecord } from "@/components/CoreMowingForm";
import type { ManualMowingOptionData } from "@/components/ManualMowingForm";

const panelClass = "rounded-[1.7rem] border border-white/75 bg-white/90 p-5 shadow-[0_18px_45px_rgba(11,36,56,0.09)] backdrop-blur-xl sm:p-6";

const statusLabels = { draft: "Rozpracováno", submitted: "Odevzdáno", approved: "Schváleno" } as const;
const statusClasses = { draft: "bg-slate-100 text-slate-700", submitted: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800" } as const;
const workLabels: Record<string, string> = { vyzinani: "Vyžínání", seceni_burene: "Sečení buřeně", cisteni_porostu: "Čištění porostu", udrzba_cest: "Údržba cest", ostatni: "Ostatní" };

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("cs-CZ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Požadavek se nepodařil");
  return payload as T;
}

export default function CoreWorkerMowingWorkflow({ onBack, managerMode = false }: { onBack?: () => void; managerMode?: boolean }) {
  const [records, setRecords] = useState<CoreMowingRecord[]>([]);
  const [options, setOptions] = useState<ManualMowingOptionData | null>(null);
  const [editing, setEditing] = useState<CoreMowingRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextRecords, nextOptions] = await Promise.all([
        api<CoreMowingRecord[]>("/api/core-mowing-records"),
        api<ManualMowingOptionData>("/api/team-daily-records/options?purpose=core"),
      ]);
      setRecords(nextRecords);
      setOptions(nextOptions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Záznamy se nepodařilo načíst");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (payload: CoreMowingPayload) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await api(`/api/core-mowing-records/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setSuccess(managerMode ? "Oprava denního záznamu byla uložena." : "Rozpracovaný záznam byl upraven.");
      } else {
        await api("/api/core-mowing-records", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Rozpracovaný denní záznam byl uložen.");
      }
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Záznam se nepodařilo uložit");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (record: CoreMowingRecord, status: "draft" | "submitted" | "approved") => {
    setError("");
    setSuccess("");
    try {
      await api(`/api/core-mowing-records/${record.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSuccess(status === "submitted" ? "Záznam byl odevzdán Vedoucímu." : status === "approved" ? "Záznam byl schválen." : "Záznam byl znovu otevřen Křovákovi.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Stav se nepodařilo změnit");
    }
  };

  if ((showForm || editing) && options) return <div className="w-full space-y-4">
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    <CoreMowingForm initial={editing} options={options} managerMode={managerMode} onSubmit={submit} onCancel={() => { setShowForm(false); setEditing(null); setError(""); }} loading={saving} />
  </div>;

  return <section className="w-full space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Křováci · Kmenoví</p><h1 className="mt-1 text-3xl font-black text-slate-950">{managerMode ? "Denní záznamy Křováků" : "Moje denní záznamy"}</h1><p className="mt-2 text-sm text-slate-500">{managerMode ? "Kontrola, opravy a schvalování odevzdaných záznamů." : "Mobilní evidence práce, techniky, výkonu a dopravy."}</p></div>
      <div className="flex flex-wrap gap-2">{onBack && <button type="button" onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold">← Zpět</button>}{!managerMode && <button type="button" disabled={!options} onClick={() => { setShowForm(true); setError(""); setSuccess(""); }} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-40">+ Nový záznam</button>}</div>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{success}</div>}
    <div className={panelClass}>
      {loading ? <p className="text-sm text-slate-500">Načítám záznamy…</p> : records.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{managerMode ? "Žádný Křovák zatím nevytvořil denní záznam." : "Zatím nemáte žádný denní záznam."}</p> : <div className="space-y-3">{records.map((record) => {
        const status = record.coreStatus ?? "draft";
        const canWorkerEdit = !managerMode && status === "draft";
        return <article key={record.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{formatDate(record.date)} · {record.region.name}</p><span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusClasses[status]}`}>{statusLabels[status]}</span></div><p className="mt-1 text-sm text-slate-700">{record.location} · {record.startTime}–{record.endTime}{record.breakMinutes ? ` · přestávka ${record.breakMinutes} min` : ""}</p><p className="mt-1 text-sm text-slate-600">{workLabels[record.coreWorkType ?? ""] ?? "Práce neuvedena"}{record.performanceValue != null ? ` · ${record.performanceValue} ${record.performanceUnit === "m2" ? "m²" : record.performanceUnit === "hod" ? "hod." : record.performanceUnit}` : ""}{managerMode ? ` · ${record.user.fullName}` : ""}</p><p className="mt-1 text-xs text-slate-400">Vytvořeno {formatDateTime(record.createdAt)}</p></div>
            <div className="flex flex-wrap gap-2">{(managerMode || canWorkerEdit) && <button type="button" onClick={() => { setEditing(record); setError(""); setSuccess(""); }} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">Upravit</button>}{!managerMode && status === "draft" && <button type="button" onClick={() => void changeStatus(record, "submitted")} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white">Odevzdat</button>}{managerMode && status === "submitted" && <button type="button" onClick={() => void changeStatus(record, "approved")} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Schválit</button>}{managerMode && status !== "draft" && <button type="button" onClick={() => void changeStatus(record, "draft")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Znovu otevřít</button>}</div>
          </div>
        </article>;
      })}</div>}
    </div>
  </section>;
}
