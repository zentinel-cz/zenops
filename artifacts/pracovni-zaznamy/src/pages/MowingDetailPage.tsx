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

  const { data: record, isLoading } = useGetMowingRecord(id, { query: { enabled: !!id } });
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

  if (editing) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-foreground mb-5">Upravit záznam sečení</h1>
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <MowingForm
            initialData={{
              date: record.date,
              regionId: record.regionId,
              location: record.location ?? null,
              startTime: record.startTime ?? null,
              endTime: record.endTime ?? null,
              weatherTypeId: record.weatherTypeId ?? null,
              vehicleId: record.vehicleId ?? null,
              mthStart: record.mthStart ?? null,
              mthEnd: record.mthEnd ?? null,
              mthTotal: record.mthTotal ?? null,
              fuelConsumption: record.fuelConsumption ?? null,
              refueling: record.refueling ?? null,
              workerIds: record.workerIds,
              machineIds: record.machineIds,
              accessoryIds: record.accessoryIds,
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

  const timeRange =
    record.startTime && record.endTime
      ? `${record.startTime} – ${record.endTime}`
      : record.startTime ?? record.endTime ?? null;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Hlavička */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Záznam sečení</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(record.date)}</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => { exportMowingPdf(record).catch(console.error); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
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
                className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Upravit
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Smazat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Základní informace */}
      <Section title="Základní informace">
        <Row label="Datum" value={formatDate(record.date)} />
        <Row label="Kraj / Revír" value={record.region.name} />
        <Row label="Místo" value={record.location} />
        <Row label="Pracovník (záznam)" value={record.user.fullName} />
      </Section>

      {/* Pracovní doba a počasí */}
      <Section title="Pracovní doba & Počasí">
        <Row label="Pracovní doba" value={timeRange} />
        <Row label="Počasí" value={record.weatherType?.name} />
      </Section>

      {/* Obsazení */}
      <Section title="Obsluha / Pracovníci">
        <Row
          label="Pracovníci"
          value={
            record.workers.length
              ? record.workers.map((w) => `${w.firstName} ${w.lastName}`).join(", ")
              : null
          }
        />
        <Row
          label="Stroj / Traktor"
          value={record.machines.length ? record.machines.map((m) => m.name).join(", ") : null}
        />
        {record.accessories.length > 0 && (
          <Row label="Příslušenství" value={record.accessories.map((a) => a.name).join(", ")} />
        )}
      </Section>

      {/* MTH */}
      <Section title="Motohodiny (MTH)">
        <Row label="Počáteční MTH" value={record.mthStart != null ? `${record.mthStart}` : null} />
        <Row label="Koncové MTH" value={record.mthEnd != null ? `${record.mthEnd}` : null} />
        <Row
          label="Celkové MTH"
          value={
            record.mthTotal != null ? (
              <span className="font-semibold text-primary">{record.mthTotal} hod</span>
            ) : null
          }
        />
      </Section>

      {/* Provozní hodnoty */}
      <Section title="Provozní hodnoty">
        <Row
          label="Auto / Vozidlo"
          value={
            record.vehicle
              ? `${record.vehicle.name}${record.vehicle.licensePlate ? ` (${record.vehicle.licensePlate})` : ""}`
              : null
          }
        />
        <Row
          label="Spotřeba"
          value={record.fuelConsumption != null ? `${record.fuelConsumption} l` : null}
        />
        <Row label="Tankování" value={record.refueling != null ? `${record.refueling} l` : null} />
      </Section>

      {/* Poznámka */}
      {record.note && (
        <Section title="Poznámka / Porucha">
          <div className="px-4 py-3">
            <p className="text-sm text-foreground whitespace-pre-wrap">{record.note}</p>
          </div>
        </Section>
      )}

      <button
        onClick={() => navigate("/seceni")}
        className="text-sm text-primary hover:underline"
      >
        ← Zpět na seznam
      </button>
    </div>
  );
}
