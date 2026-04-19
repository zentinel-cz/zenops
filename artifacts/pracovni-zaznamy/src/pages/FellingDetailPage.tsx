import { useRoute, useLocation } from "wouter";
import {
  useGetFellingRecord,
  useUpdateFellingRecord,
  useDeleteFellingRecord,
  getListFellingRecordsQueryKey,
  getGetFellingRecordQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDateTime } from "@/lib/utils";
import FellingForm, { type FellingFormData } from "@/components/FellingForm";
import { exportFellingPdf } from "@/lib/exportPdf";
import { toast } from "sonner";

export default function FellingDetailPage() {
  const [, params] = useRoute("/kaceni/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const id = params ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: record, isLoading } = useGetFellingRecord(id, { query: { enabled: !!id } });
  const updateMutation = useUpdateFellingRecord();
  const deleteMutation = useDeleteFellingRecord();

  const canEdit = user?.role === "admin" || record?.userId === user?.id;

  const handleSubmit = async (data: FellingFormData) => {
    try {
      await updateMutation.mutateAsync({ id, data: data as never });
      queryClient.invalidateQueries({ queryKey: getGetFellingRecordQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListFellingRecordsQueryKey() });
      toast.success("Záznam byl upraven");
      setEditing(false);
    } catch {
      toast.error("Nepodařilo se upravit záznam");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Smazat tento záznam ze dne ${record ? formatDate(record.date) : ""}? Tato akce je nevratná.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListFellingRecordsQueryKey() });
      toast.success("Záznam byl smazán");
      navigate("/kaceni");
    } catch {
      toast.error("Nepodařilo se smazat záznam");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-10 bg-card border border-card-border rounded-xl animate-pulse" />
        <div className="h-64 bg-card border border-card-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Záznam nenalezen nebo nemáte oprávnění k zobrazení.</p>
        <button onClick={() => navigate("/kaceni")} className="mt-4 text-sm text-primary hover:underline">
          Zpět na seznam
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="max-w-2xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">Upravit záznam kácení</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate(record.date)} — {record.region.name}</p>
        </div>
        <FellingForm
          initialData={{
            date: record.date,
            regionId: record.regionId,
            location: record.location ?? null,
            startTime: record.startTime ?? null,
            endTime: record.endTime ?? null,
            weatherTypeId: record.weatherTypeId ?? null,
            temperature: record.temperature ?? null,
            mth: record.mth != null ? Number(record.mth) : null,
            fuelConsumption: record.fuelConsumption != null ? Number(record.fuelConsumption) : null,
            refueling: record.refueling != null ? Number(record.refueling) : null,
            workerIds: record.workerIds,
            vehicleIds: record.vehicleIds,
            machineIds: record.machineIds,
            accessoryIds: record.accessoryIds,
            note: record.note ?? null,
          }}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(false)}
          isLoading={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Hlavička */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Záznam kácení</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(record.date)} — {record.region.name}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => { exportFellingPdf(record).catch(console.error); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-xl text-sm font-medium hover:bg-secondary/80"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-xl text-sm font-medium hover:bg-secondary/80"
              >
                Upravit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Mazání..." : "Smazat"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Základní info */}
      <Section title="Základní informace">
        <Row label="Datum" value={formatDate(record.date)} />
        <Row label="Kraj / Revír" value={record.region.name + (record.region.code ? ` (${record.region.code})` : "")} />
        {record.location && <Row label="Místo" value={record.location} />}
        <Row label="Autor" value={record.user.fullName} />
      </Section>

      {/* Pracovní doba a počasí */}
      <Section title="Pracovní doba & Počasí">
        <Row
          label="Pracovní doba"
          value={record.startTime && record.endTime ? `${record.startTime} – ${record.endTime}` : record.startTime ? `od ${record.startTime}` : "—"}
        />
        <Row label="Počasí" value={record.weatherType?.name ?? "—"} />
        <Row label="Teplota" value={record.temperature != null ? `${record.temperature} °C` : "—"} />
      </Section>

      {/* Pracovníci */}
      <Section title="Obsluha / Pracovníci">
        {record.workers.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {record.workers.map((w) => (
              <span key={w.id} className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-lg text-sm border border-border">
                {w.firstName} {w.lastName}
              </span>
            ))}
          </div>
        ) : (
          <Row label="" value="—" />
        )}
      </Section>

      {/* Technika */}
      <Section title="Technika">
        <Row
          label="Auta / Vozidla"
          value={record.vehicles.length > 0 ? record.vehicles.map((v) => v.name + (v.licensePlate ? ` (${v.licensePlate})` : "")).join(", ") : "—"}
        />
        <Row
          label="Stroje"
          value={record.machines.length > 0 ? record.machines.map((m) => m.name).join(", ") : "—"}
        />
        {record.accessories.length > 0 && (
          <Row label="Příslušenství" value={record.accessories.map((a) => a.name).join(", ")} />
        )}
      </Section>

      {/* Provozní hodnoty */}
      <Section title="Provozní hodnoty">
        <Row label="MTH" value={record.mth != null ? `${record.mth} mth` : "—"} />
        <Row label="Spotřeba" value={record.fuelConsumption != null ? `${record.fuelConsumption} l` : "—"} />
        <Row label="Tankování" value={record.refueling != null ? `${record.refueling} l` : "—"} />
      </Section>

      {/* Poznámka */}
      {record.note && (
        <Section title="Poznámka">
          <div className="px-4 py-3 text-sm text-foreground whitespace-pre-wrap">{record.note}</div>
        </Section>
      )}

      {/* Meta */}
      <div className="text-xs text-muted-foreground px-1">
        Vytvořeno: {formatDateTime(record.createdAt)} • Upraveno: {formatDateTime(record.updatedAt)}
      </div>

      <button
        onClick={() => navigate("/kaceni")}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Zpět na seznam
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary/30 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!label) return null;
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
