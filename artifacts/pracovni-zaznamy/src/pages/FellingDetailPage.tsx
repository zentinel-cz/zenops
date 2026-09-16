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
import { FELLING_WORK_TYPE_OPTIONS, getOptionLabel } from "@/lib/recordOptions";
import { toast } from "sonner";

export default function FellingDetailPage() {
  const [, params] = useRoute("/kaceni/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const id = params ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: record, isLoading } = useGetFellingRecord(id);
  const updateMutation = useUpdateFellingRecord();
  const deleteMutation = useDeleteFellingRecord();

  const canEdit = user?.role === "admin" || record?.userId === user?.id;

  const handleSubmit = async (data: FellingFormData) => {
    try {
      await updateMutation.mutateAsync({ id, data });
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

  const workerTimeSummary = record.workerTimeEntries?.map((entry) => {
    const name = entry.worker ? `${entry.worker.firstName} ${entry.worker.lastName}` : `Pracovník #${entry.workerId}`;
    const time = entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : "bez času";
    return `${name} (${time})`;
  }).join(", ");
  const machineMthSummary = record.machineMthEntries?.map((entry) => {
    const name = entry.machine?.name ?? `Stroj #${entry.machineId}`;
    const range = entry.mthStart != null && entry.mthEnd != null ? `${entry.mthStart} → ${entry.mthEnd}` : "bez rozsahu";
    const total = entry.mthTotal != null ? `${entry.mthTotal} h` : "bez součtu";
    const fuel = entry.fuelConsumption != null ? `${entry.fuelConsumption} l` : "—";
    const refueling = entry.refueling != null ? `${entry.refueling} l` : "—";
    return `${name} (${range}, ${total}, spotřeba ${fuel}, tankování ${refueling})`;
  }).join(", ");

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
            workType: record.workType ?? null,
            location: record.location ?? null,
            startTime: record.startTime ?? null,
            endTime: record.endTime ?? null,
            weatherTypeId: record.weatherTypeId ?? null,
            weatherTypeIds: record.weatherTypeIds ?? [],
            temperature: record.temperature ?? null,
            mth: record.mth != null ? Number(record.mth) : null,
            fuelConsumption: record.fuelConsumption != null ? Number(record.fuelConsumption) : null,
            refueling: record.refueling != null ? Number(record.refueling) : null,
            workerIds: record.workerIds,
            manualWorkerIds: record.manualWorkerIds ?? [],
            machineWorkerIds: record.machineWorkerIds ?? [],
            workerTimeEntries: record.workerTimeEntries ?? [],
            vehicleIds: record.vehicleIds,
            machineIds: record.machineIds,
            machineMthEntries: record.machineMthEntries ?? [],
            accessoryIds: record.accessoryIds,
            assignedAverage: record.assignedAverage ?? null,
            vehicleKmStart: record.vehicleKmStart ?? null,
            vehicleKmEnd: record.vehicleKmEnd ?? null,
            vehicleKmTotal: record.vehicleKmTotal ?? null,
            vehicleRefueling: record.vehicleRefueling ?? null,
            trafficMarking: record.trafficMarking ?? null,
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
            Export PDF
          </button>
          {canEdit && (
            <>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-xl text-sm font-medium hover:bg-secondary/80">
                Upravit
              </button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {deleteMutation.isPending ? "Mazání..." : "Smazat"}
              </button>
            </>
          )}
        </div>
      </div>

      <Section title="Typ a základní info">
        <Row label="Typ práce" value={getOptionLabel(FELLING_WORK_TYPE_OPTIONS, record.workType) ?? "—"} />
        <Row label="Datum" value={formatDate(record.date)} />
        <Row label="Kraj / Revír" value={record.region.name + (record.region.code ? ` (${record.region.code})` : "")} />
        <Row label="Místo" value={record.location ?? "—"} />
        <Row label="Autor" value={record.user.fullName} />
      </Section>

      <Section title="Pracovní doba & Počasí">
        <Row label="Pracovní doba" value={record.startTime && record.endTime ? `${record.startTime} – ${record.endTime}` : record.startTime ? `od ${record.startTime}` : "—"} />
        <Row label="Počasí" value={record.weatherTypes?.length ? record.weatherTypes.map((item) => item.name).join(", ") : record.weatherType?.name ?? "—"} />
        <Row label="Teplota" value={record.temperature != null ? `${record.temperature} °C` : "—"} />
      </Section>

      <Section title="Obsluha">
        <Row label="Ruční obsluha" value={record.manualWorkers?.length ? record.manualWorkers.map((w) => `${w.firstName} ${w.lastName}`).join(", ") : "—"} />
        <Row label="Strojní obsluha" value={record.machineWorkers?.length ? record.machineWorkers.map((w) => `${w.firstName} ${w.lastName}`).join(", ") : "—"} />
        <Row label="Časy pracovníků" value={workerTimeSummary ?? "—"} />
        <Row label="Přiřazený průměr" value={record.assignedAverage ?? "—"} />
      </Section>

      <Section title="Technika">
        <Row label="Auta / Vozidla" value={record.vehicles.length > 0 ? record.vehicles.map((v) => v.name + (v.licensePlate ? ` (${v.licensePlate})` : "")).join(", ") : "—"} />
        <Row label="Stroje" value={record.machines.length > 0 ? record.machines.map((m) => m.name).join(", ") : "—"} />
        <Row label="Příslušenství" value={record.accessories.length > 0 ? record.accessories.map((a) => a.name).join(", ") : "—"} />
      </Section>

      <Section title="Provozní hodnoty">
        <Row label="MTH po strojích" value={machineMthSummary ?? "—"} />
        <Row label="Celkové MTH" value={record.mth != null ? `${record.mth} mth` : "—"} />
        <Row label="Spotřeba stroje" value={record.fuelConsumption != null ? `${record.fuelConsumption} l` : "—"} />
        <Row label="Tankování stroje" value={record.refueling != null ? `${record.refueling} l` : "—"} />
        <Row label="Počáteční km" value={record.vehicleKmStart != null ? `${record.vehicleKmStart}` : "—"} />
        <Row label="Koncové km" value={record.vehicleKmEnd != null ? `${record.vehicleKmEnd}` : "—"} />
        <Row label="Celkem km" value={record.vehicleKmTotal != null ? `${record.vehicleKmTotal} km` : "—"} />
        <Row label="Tankování vozidla" value={record.vehicleRefueling != null ? `${record.vehicleRefueling} l` : "—"} />
      </Section>

      <Section title="Dopravní značení">
        <Row label="DIO" value={record.trafficMarking ?? "—"} />
      </Section>

      {record.note && (
        <Section title="Poznámka">
          <div className="px-4 py-3 text-sm text-foreground whitespace-pre-wrap">{record.note}</div>
        </Section>
      )}

      <div className="text-xs text-muted-foreground px-1">
        Vytvořeno: {formatDateTime(record.createdAt)} • Upraveno: {formatDateTime(record.updatedAt)}
      </div>

      <button onClick={() => navigate("/kaceni")} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
