import { useState } from "react";
import { Link } from "wouter";
import {
  useListFellingRecords,
  useListRegions,
  useDeleteFellingRecord,
  getListFellingRecordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { exportFellingExcel } from "@/lib/exportExcel";
import { exportFellingListPdf } from "@/lib/exportPdf";

export default function FellingListPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const params = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    regionId: regionId ?? undefined,
  };

  const { data: records, isLoading } = useListFellingRecords(params);
  const { data: regions } = useListRegions();
  const deleteMutation = useDeleteFellingRecord();

  const handleDelete = async (id: number, date: string) => {
    if (!confirm(`Smazat záznam ze dne ${formatDate(date)}? Tato akce je nevratná.`)) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFellingRecordsQueryKey() });
  };

  const inputClass = "px-2.5 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const hasFilter = dateFrom || dateTo || regionId;

  const filterDesc = [
    dateFrom && `od ${dateFrom}`,
    dateTo && `do ${dateTo}`,
    regionId && regions?.find((r) => r.id === regionId)?.name,
  ].filter(Boolean).join(", ") || undefined;

  const handleExcelExport = () => {
    if (!records?.length) return;
    exportFellingExcel(records);
  };

  const handlePdfExport = async () => {
    if (!records?.length) return;
    await exportFellingListPdf(records, filterDesc);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Záznamy kácení</h1>
          {records && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {records.length} {records.length === 1 ? "záznam" : records.length >= 2 && records.length <= 4 ? "záznamy" : "záznamů"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {records && records.length > 0 && (
            <>
              <button
                onClick={handleExcelExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border border-border rounded-xl text-sm font-medium hover:bg-secondary/80"
                title="Exportovat do Excelu"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={handlePdfExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border border-border rounded-xl text-sm font-medium hover:bg-secondary/80"
                title="Exportovat do PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
            </>
          )}
          <Link
            href="/kaceni/novy"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nový záznam
          </Link>
        </div>
      </div>

      {/* Filtry */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Filtr</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Datum od</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Datum do</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Kraj / Revír</label>
            <select
              value={regionId ?? ""}
              onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">Všechny</option>
              {regions?.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setRegionId(null); }}
              className="text-sm text-primary hover:underline"
            >
              Zrušit filtr
            </button>
          )}
        </div>
      </div>

      {/* Seznam */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !records?.length ? (
        <div className="bg-card border border-card-border rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🌲</div>
          <p className="text-muted-foreground text-sm mb-4">
            {hasFilter ? "Žádné záznamy pro zvolený filtr." : "Zatím žádné záznamy kácení."}
          </p>
          {!hasFilter && (
            <Link href="/kaceni/novy" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
              Vytvořit první záznam
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          {records.map((r) => (
            <div key={r.id} className="hover:bg-accent/20 transition-colors">
              <Link href={`/kaceni/${r.id}`} className="block px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{formatDate(r.date)}</span>
                      <span className="text-sm text-muted-foreground">—</span>
                      <span className="text-sm text-foreground">{r.region.name}</span>
                      {r.location && (
                        <span className="text-xs text-muted-foreground">• {r.location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {user?.role === "admin" && (
                        <span className="font-medium text-foreground/70">{r.user.fullName}</span>
                      )}
                      {r.startTime && r.endTime && (
                        <span>{r.startTime}–{r.endTime}</span>
                      )}
                      {r.workers.length > 0 && (
                        <span>👷 {r.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ")}</span>
                      )}
                      {r.vehicles.length > 0 && (
                        <span>🚗 {r.vehicles.map((v) => v.name).join(", ")}</span>
                      )}
                      {r.machines.length > 0 && (
                        <span>🚜 {r.machines.length} {r.machines.length === 1 ? "stroj" : "stroje/strojů"}</span>
                      )}
                      {r.mth != null && <span>MTH: {r.mth}</span>}
                      {r.weatherType && <span>☀️ {r.weatherType.name}</span>}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <div className="flex gap-2 px-4 pb-3">
                <Link
                  href={`/kaceni/${r.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Detail
                </Link>
                <span className="text-xs text-border">|</span>
                <button
                  onClick={() => handleDelete(r.id, r.date)}
                  className="text-xs text-destructive hover:underline"
                >
                  Smazat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
