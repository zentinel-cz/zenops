export interface WorkerTimeEntry {
  workerId: number;
  category: "manual" | "machine";
  shiftType?: "morning" | "evening" | "custom" | null;
  startTime: string | null;
  endTime: string | null;
}

export interface MachineMthEntry {
  machineId: number;
  accessoryId: number | null;
  operatorId: number | null;
  accessoryConfirmed?: boolean;
  startTime: string | null;
  endTime: string | null;
  mthStart: number | null;
  mthEnd: number | null;
  mthTotal: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
}

export interface VehicleEntry {
  vehicleId: number;
  kmStart: number | null;
  kmEnd: number | null;
  kmTotal: number | null;
  refueling: number | null;
}

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function uniqueIds(...lists: Array<number[] | null | undefined>) {
  return Array.from(new Set(lists.flatMap((list) => list ?? [])));
}

export function calculateMachineMthTotal(start: number | null, end: number | null) {
  if (start == null || end == null || end < start) return null;
  return Math.round((end - start) * 100) / 100;
}

export function sumMachineMthTotals(entries: MachineMthEntry[]) {
  const totals = entries.map((entry) => entry.mthTotal).filter((value): value is number => value != null);
  if (!totals.length) return null;
  return Math.round(totals.reduce((sum, value) => sum + value, 0) * 100) / 100;
}

export function sumMachineValue(entries: MachineMthEntry[], field: "fuelConsumption" | "refueling") {
  const values = entries.map((entry) => entry[field]).filter((value): value is number => value != null);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
}

export function syncWorkerTimeEntries(
  entries: WorkerTimeEntry[],
  selectedIds: number[],
  category: WorkerTimeEntry["category"],
  defaultStartTime: string,
  defaultEndTime: string,
) {
  const byId = new Map(entries.map((entry) => [entry.workerId, entry] as const));
  const next = entries.filter((entry) => !(entry.category === category && !selectedIds.includes(entry.workerId)));

  selectedIds.forEach((workerId) => {
    if (byId.has(workerId)) return;
    next.push({
      workerId,
      category,
      startTime: defaultStartTime || null,
      endTime: defaultEndTime || null,
    });
  });

  return next.sort((a, b) => a.workerId - b.workerId);
}

export function syncMachineMthEntries(entries: MachineMthEntry[], selectedIds: number[], defaultStartTime: string, defaultEndTime: string) {
  const byId = new Map(entries.map((entry) => [entry.machineId, entry] as const));
  const next = entries.filter((entry) => selectedIds.includes(entry.machineId));

  selectedIds.forEach((machineId) => {
    if (byId.has(machineId)) return;
    next.push({
      machineId,
      accessoryId: null,
      operatorId: null,
      startTime: defaultStartTime || null,
      endTime: defaultEndTime || null,
      mthStart: null,
      mthEnd: null,
      mthTotal: null,
      fuelConsumption: null,
      refueling: null,
    });
  });

  return next.sort((a, b) => a.machineId - b.machineId);
}
