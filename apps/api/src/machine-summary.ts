import type { DailyMachineSummary, MachineUsageSummary } from "@zenops/contracts";

type MachineEntry = {
  id: string; employeeId: string; employeeName: string; projectCode: string; projectName: string;
  startAt: string | Date; endAt: string | Date; entryState: string; machineUsages: MachineUsageSummary[];
};

/** Group physical usages, never multiply work time or sum absolute meter readings. */
export function summarizeMachines(entries: MachineEntry[]): DailyMachineSummary[] {
  const groups = new Map<string, DailyMachineSummary>();
  const seen = new Set<string>();
  const add = (total: string | null, value: string | null) => value == null ? total
    : ((Math.round(Number(total ?? 0) * 100) + Math.round(Number(value) * 100)) / 100).toFixed(2);
  for (const entry of entries) for (const usage of entry.machineUsages) {
    if (seen.has(usage.id)) continue;
    seen.add(usage.id);
    let group = groups.get(usage.machineId);
    if (!group) {
      group = { machineId: usage.machineId, machineCode: usage.machineCode, machineName: usage.machineName,
        mth: null, measuredUsages: 0, fuelConsumed: null, fuelRefuelled: null, usages: [] };
      groups.set(usage.machineId, group);
    }
    if (usage.startMth != null && usage.endMth != null) {
      const difference = ((Math.round(Number(usage.endMth) * 100) - Math.round(Number(usage.startMth) * 100)) / 100).toFixed(2);
      group.mth = add(group.mth, difference);
      group.measuredUsages++;
    }
    group.fuelConsumed = add(group.fuelConsumed, usage.fuelConsumed);
    group.fuelRefuelled = add(group.fuelRefuelled, usage.fuelRefuelled);
    group.usages.push({ ...usage, entryId: entry.id, employeeId: entry.employeeId, employeeName: entry.employeeName,
      projectCode: entry.projectCode, projectName: entry.projectName, entryState: entry.entryState,
      startAt: new Date(entry.startAt).toISOString(), endAt: new Date(entry.endAt).toISOString() });
  }
  for (const group of groups.values()) group.usages.sort((a, b) =>
    Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));
  return [...groups.values()].sort((a, b) => a.machineCode.localeCompare(b.machineCode, "cs"));
}
