import type { MachineUsageSummary } from "@zenops/contracts";

export function machineUsageSearchText(usages: MachineUsageSummary[]): string {
  return usages.map((usage) => `${usage.machineCode} ${usage.machineName} ${usage.startMth ?? ""} ${usage.endMth ?? ""} ${usage.fuelConsumed ?? ""} ${usage.fuelRefuelled ?? ""} ${usage.attachments.join(" ")}`).join(" ");
}

export function MachineUsageDetails({ usages, onEditMth, disabled }: {
  usages: MachineUsageSummary[]; onEditMth?: ((usage: MachineUsageSummary) => void) | undefined; disabled?: boolean;
}) {
  return <>{usages.map((usage) => <small key={usage.id}>
    Stroj {usage.machineCode} · {usage.machineName}
    {(usage.startMth != null || usage.endMth != null) && <><br />MTH {usage.startMth ?? "–"}–{usage.endMth ?? "–"}</>}
    <br />Spotřeba {usage.fuelConsumed ?? "–"} l · Tankování {usage.fuelRefuelled ?? "–"} l
    {usage.attachments.length > 0 && <><br />Příslušenství: {usage.attachments.join(", ")}</>}
    {onEditMth && (usage.startMth != null || usage.endMth != null) && <><br /><button type="button"
      className="table-action worker-mth-action" disabled={disabled} onClick={() => onEditMth(usage)}>{usage.machineCode} · Opravit MTH</button></>}
  </small>)}</>;
}
