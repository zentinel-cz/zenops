import { useRoute, useLocation } from "wouter";
import {
  useGetMowingRecord,
  useUpdateMowingRecord,
  useDeleteMowingRecord,
  getListMowingRecordsQueryKey,
  getGetMowingRecordQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import MowingForm, { type MowingFormData } from "@/components/MowingForm";
import { exportMowingPdf } from "@/lib/exportPdf";
import { getOptionLabel, MOWING_KIND_OPTIONS, MOWING_SECTION_OPTIONS, MOWING_WORK_TYPE_OPTIONS } from "@/lib/recordOptions";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary/50 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm text-foreground flex-1">{value || "—"}</span>
    </div>
  );
}

export default function MowingDetailPage() {
  const [, params] = useRoute("/seceni/:id");
  const [, navigate] = useLocation();
  const id = params ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();

  const { data: record, isLoading } = useGetMowingRecord(id);
  const updateMutation = useUpdateMowingRecord();
  const deleteMutation = useDeleteMowingRecord();

  const handleSubmit = async (data: MowingFormData) => {
    try {
      await updateMutation.mutateAsync({ id, data });
      queryClient.invalidateQueries({ queryKey: getGetMowingRecordQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListMowingRecordsQueryKey() });
      toast.success("Záznam byl upraven");
      setEditing(false);
    } catch {
      toast.error("Nepodařilo se upravit záznam");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Opravdu chcete smazat tento záznam?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMowingRecordsQueryKey() });
      toast.success("Záznam byl smazán");
      navigate("/seceni");
    } catch {
      toast.error("Nepodařilo se smazat záznam");
    }
  };

  if (isLoading) return <div className="h-48 bg-card border border-card-border rounded-xl animate-pulse" />;
  if (!record) return <div className="text-muted-foreground">Záznam nenalezen.</div>;

  const canEdit = user?.role === "admin" || record.userId === user?.id;
  const timeRange = record.startTime && record.endTime ? `${record.startTime} – ${record.endTime}` : record.startTime ?? record.endTime ?? null;
  const workerTimeSummary = record.workerTimeEntries?.map((entry) => {
    const name = entry.worker ? `${entry.worker.firstName} ${entry.worker.lastName}` : `Pracovník #${entry.workerId}`;
    const time = entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : "bez času";
    return `${name} (${time})`;
  }).join(", ");
  const machineMthSummary = record.machineMthEntries?.map((entry) => {
    const name = entry.machine?.name ?? `Stroj #${entry.machineId}`;
    const accessory = entry.accessory?.name ?? "bez příslušenství";
    const operator = entry.operator ? `${entry.operator.firstName} ${entry.operator.lastName}` : "bez obsluhy";
    const time = entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : "bez času";
    const range = entry.mthStart != null && entry.mthEnd != null ? `${entry.mthStart} → ${entry.mthEnd}` : "bez rozsahu";
    const total = entry.mthTotal != null ? `${entry.mthTotal} h` : "bez součtu";
    const fuel = entry.fuelConsumption != null ? `${entry.fuelConsumption} l` : "—";
    const refueling = entry.refueling != null ? `${entry.refueling} l` : "—";
    return `${name} + ${accessory} — obsluha ${operator}; ${time}, MTH ${range} (${total}), spotřeba ${fuel}, tankování ${refueling}`;
  }).join("\n");
  const vehicleSummary = record.vehicleEntries?.map((entry, index) => {
    const name = entry.vehicle ? `${entry.vehicle.name}${entry.vehicle.licensePlate ? ` (${entry.vehicle.licensePlate})` : ""}` : `Auto #${entry.vehicleId}`;
    const range = entry.kmStart != null && entry.kmEnd != null ? `${entry.kmStart} → ${entry.kmEnd} km` : "bez rozsahu km";
    return `${index + 1}. ${name}: ${range}, celkem ${entry.kmTotal ?? "—"} km, tankování ${entry.refueling ?? "—"} l`;
  }).join("\n");

  if (editing) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-foreground mb-5">Upravit záznam sečení</h1>
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <MowingForm
            initialData={{
              date: record.date,
              regionId: record.regionId,
              workType: record.workType ?? null,
              mowingSection: record.mowingSection ?? null,
              mowingKind: record.mowingKind ?? null,
              manualMowingKind: record.manualMowingKind ?? null,
              contractorCompanyId: record.contractorCompanyId ?? null,
              location: record.location ?? null,
              startTime: record.startTime ?? null,
              endTime: record.endTime ?? null,
              weatherTypeId: record.weatherTypeId ?? null,
              weatherTypeIds: record.weatherTypeIds ?? [],
              temperature: record.temperature ?? null,
              vehicleId: record.vehicleId ?? null,
              vehicleEntries: record.vehicleEntries ?? [],
              mthStart: record.mthStart ?? null,
              mthEnd: record.mthEnd ?? null,
              mthTotal: record.mthTotal ?? null,
              fuelConsumption: record.fuelConsumption ?? null,
              refueling: record.refueling ?? null,
              workerIds: record.workerIds,
              manualWorkerIds: record.manualWorkerIds ?? [],
              machineWorkerIds: record.machineWorkerIds ?? [],
              workerTimeEntries: record.workerTimeEntries ?? [],
              machineIds: record.machineIds,
              machineMthEntries: record.machineMthEntries ?? [],
              accessoryIds: record.accessoryIds,
              assignedAverage: record.assignedAverage ?? null,
              dayHours: record.dayHours ?? null,
              nightHours: record.nightHours ?? null,
              laborHours: record.laborHours ?? null,
              vehicleKmStart: record.vehicleKmStart ?? null,
              vehicleKmEnd: record.vehicleKmEnd ?? null,
              vehicleKmTotal: record.vehicleKmTotal ?? null,
              vehicleRefueling: record.vehicleRefueling ?? null,
              brushcutterRefueling: record.brushcutterRefueling ?? null,
              trafficMarking: record.trafficMarking ?? null,
              note: record.note ?? null,
            }}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(false)}
            isLoading={updateMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Denní záznam sečení</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(record.date)}</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => { exportMowingPdf(record).catch(console.error); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Export PDF
          </button>
          {canEdit && (
            <>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Upravit
              </button>
              <button onClick={handleDelete} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                Smazat
              </button>
            </>
          )}
        </div>
      </div>

      <Section title="Typ a evidence">
        <Row label="Typ práce" value={getOptionLabel(MOWING_WORK_TYPE_OPTIONS, record.workType)} />
        <Row label="Sekce" value={getOptionLabel(MOWING_SECTION_OPTIONS, record.mowingSection)} />
        <Row label="Druh sečení" value={getOptionLabel(MOWING_KIND_OPTIONS, record.mowingKind)} />
        {record.mowingKind === "rucni" && <Row label="Varianta ručního sečení" value={record.manualMowingKind === "core" ? "Kmenoví zaměstnanci – křovinořezy" : record.manualMowingKind === "slope" ? "Svahové sekačky" : record.manualMowingKind === "subcontractor" ? "Subdodavatel" : null} />}
        {record.manualMowingKind === "subcontractor" && <Row label="Subdodavatelská firma" value={record.contractorCompany?.name} />}
        <Row label="Datum" value={formatDate(record.date)} />
        <Row label="Kraj / Revír" value={record.region.name} />
        <Row label="Místo" value={record.location} />
        <Row label="Pracovník (záznam)" value={record.user.fullName} />
      </Section>

      <Section title="Pracovní doba & Počasí">
        <Row label="Čas" value={timeRange} />
        <Row label="Počasí" value={record.weatherTypes?.length ? record.weatherTypes.map((item) => item.name).join(", ") : record.weatherType?.name} />
        <Row label="Teplota" value={record.temperature != null ? `${record.temperature} °C` : null} />
      </Section>

      <Section title="Obsluha / Pracovníci">
        <Row label="Strojní obsluha" value={record.machineWorkers?.length ? record.machineWorkers.map((w) => `${w.firstName} ${w.lastName}`).join(", ") : null} />
        <Row label="Časy pracovníků" value={workerTimeSummary} />
        <Row label="Přiřazený průměr" value={record.assignedAverage} />
        <Row label="Stroj / Traktor" value={record.machines.length ? record.machines.map((m) => m.name).join(", ") : null} />
        <Row label="Příslušenství" value={record.accessories.length ? record.accessories.map((a) => a.name).join(", ") : null} />
      </Section>

      {(record.mowingKind === "strojni" || record.manualMowingKind === "slope") && <Section title={record.manualMowingKind === "slope" ? "Svahové sekačky a provoz" : "Traktory a provoz"}>
        <Row label="Základní sestavy" value={<span className="whitespace-pre-line">{machineMthSummary}</span>} />
        <Row label="Celkové MTH" value={record.mthTotal != null ? <span className="font-semibold text-primary">{record.mthTotal} hod</span> : null} />
        <Row label="Spotřeba stroje" value={record.fuelConsumption != null ? `${record.fuelConsumption} l` : null} />
        <Row label="Tankování stroje" value={record.refueling != null ? `${record.refueling} l` : null} />
      </Section>}

      {record.manualMowingKind === "core" && <Section title="Křovinořezy"><Row label="Tankování" value={record.brushcutterRefueling != null ? `${record.brushcutterRefueling} l` : null} /></Section>}

      <Section title="Auto denního záznamu">
        <Row label="Jízdy aut" value={<span className="whitespace-pre-line">{vehicleSummary}</span>} />
        <Row label="Celkem km" value={record.vehicleKmTotal != null ? `${record.vehicleKmTotal} km` : null} />
        <Row label="Tankování celkem" value={record.vehicleRefueling != null ? `${record.vehicleRefueling} l` : null} />
      </Section>

      <Section title="Dopravní značení">
        <Row label="DIO" value={record.trafficMarking} />
      </Section>

      {record.note && (
        <Section title="Poznámka / Porucha">
          <div className="px-4 py-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{record.note}</p>
          </div>
        </Section>
      )}

      <button onClick={() => navigate("/seceni")} className="text-sm text-primary hover:underline">
        ← Zpět na seznam
      </button>
    </div>
  );
}
