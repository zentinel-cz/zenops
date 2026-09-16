import { useState } from "react";
import { Link } from "wouter";
import {
  useListMowingRecords,
  useListRegions,
  useDeleteMowingRecord,
  getListMowingRecordsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { exportMowingExcel } from "@/lib/exportExcel";
import { exportMowingListPdf } from "@/lib/exportPdf";
import { MOWING_WORK_TYPE_OPTIONS, getOptionLabel } from "@/lib/recordOptions";

export default function MowingListPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [regionId, setRegionId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const params = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    regionId: regionId ?? undefined,
  };

  const { data: records, isLoading } = useListMowingRecords(params);
  const { data: regions } = useListRegions();
  const deleteMutation = useDeleteMowingRecord();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Opravdu chcete smazat tento záznam?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListMowingRecordsQueryKey() });
  };

  const inputClass = "px-2 py-1.5 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const hasFilter = dateFrom || dateTo || regionId;

  const filterDesc = [
    dateFrom && `od ${dateFrom}`,
    dateTo && `do ${dateTo}`,
    regionId && regions?.find((r) => r.id === regionId)?.name,
  ].filter(Boolean).join(", ") || undefined;

  const handleExcelExport = () => {
    if (!records?.length) return;
    exportMowingExcel(records);
  };

  const handlePdfExport = async () => {
    if (!records?.length) return;
    await exportMowingListPdf(records, filterDesc);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Záznamy sečení</h1>
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
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80"
                title="Exportovat do Excelu"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={handlePdfExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80"
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
            href="/seceni/novy"
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            + Nový záznam
          </Link>
        </div>
      </div>

      {/* Filtr */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 tracking-wide">Filtr</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Od:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Do:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Revír:</label>
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
              className="text-sm text-muted-foreground hover:text-foreground underline"
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
            <div key={i} className="h-16 bg-card border border-card-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !records?.length ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          {hasFilter ? "Žádné záznamy pro daný filtr." : (
            <>Žádné záznamy. <Link href="/seceni/novy" className="text-primary underline">Vytvořit první záznam</Link></>
          )}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          {records.map((r) => {
            const canDelete = user?.role === "admin" || r.userId === user?.id;
            return (
              <Link key={r.id} href={`/seceni/${r.id}`} className="block">
                <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(r.date)} — {r.region.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.user.fullName}
                      {r.workType ? ` • ${getOptionLabel(MOWING_WORK_TYPE_OPTIONS, r.workType)}` : ""}
                      {r.machines.length ? ` • ${r.machines.map((m) => m.name).join(", ")}` : ""}
                      {r.mthTotal != null ? ` • ${r.mthTotal} MTH celkem` : ""}
                      {r.workers.length ? ` • ${r.workers.length} prac.` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="px-2 py-1 text-xs text-primary hover:underline">Detail</span>
                    {canDelete && (
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="px-2 py-1 text-xs text-destructive hover:underline"
                      >
                        Smazat
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
