import type { MachineUsageSummary } from "@zenops/contracts";

export function machineUsageSearchText(usages: MachineUsageSummary[]): string {
  return usages.map((usage) => `${usage.machineCode} ${usage.machineName} ${usage.startMth ?? ""} ${usage.endMth ?? ""} ${usage.fuelConsumed ?? ""} ${usage.fuelRefuelled ?? ""} ${usage.attachments.join(" ")}`).join(" ");
}

export function MachineUsageDetails({ usages }: { usages: MachineUsageSummary[] }) {
  return <>{usages.map((usage) => <small key={usage.id}>
    Stroj {usage.machineCode} · {usage.machineName}
    {(usage.startMth != null || usage.endMth != null) && <><br />MTH {usage.startMth ?? "–"}–{usage.endMth ?? "–"}</>}
    <br />Spotřeba {usage.fuelConsumed ?? "–"} l · Tankování {usage.fuelRefuelled ?? "–"} l
    {usage.attachments.length > 0 && <><br />Příslušenství: {usage.attachments.join(", ")}</>}
  </small>)}</>;
}
