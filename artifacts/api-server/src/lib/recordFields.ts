export function parseIdList(value: string | null | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function serializeIdList(ids: number[] | null | undefined): string | null {
  if (!ids?.length) return null;
  const unique = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  return unique.length ? unique.join(",") : null;
}

export function uniqueIds(...lists: Array<number[] | null | undefined>): number[] {
  return Array.from(
    new Set(
      lists
        .flatMap((list) => list ?? [])
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
}

export function parseDbNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface WorkerTimeEntryPayload {
  workerId: number;
  category: "manual" | "machine";
  shiftType?: "morning" | "evening" | "custom" | null;
  startTime: string | null;
  endTime: string | null;
}

export interface MachineMthEntryPayload {
  machineId: number;
  accessoryId?: number | null;
  operatorId?: number | null;
  startTime: string | null;
  endTime: string | null;
  mthStart: number | null;
  mthEnd: number | null;
  mthTotal: number | null;
  fuelConsumption: number | null;
  refueling: number | null;
}

export interface VehicleEntryPayload {
  vehicleId: number;
  kmStart: number | null;
  kmEnd: number | null;
  kmTotal: number | null;
  refueling: number | null;
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function nullableTime(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function calculateDerivedTotal(start: number | null | undefined, end: number | null | undefined) {
  if (start == null || end == null || end < start) return null;
  return Math.round((end - start) * 100) / 100;
}

export function normalizeWorkerTimeEntries(entries: unknown): WorkerTimeEntryPayload[] {
  return parseJsonArray<Record<string, unknown>>(typeof entries === "string" ? entries : JSON.stringify(entries ?? []))
    .map((entry) => ({
      workerId: Number(entry.workerId),
      category: (entry.category === "machine" ? "machine" : "manual") as WorkerTimeEntryPayload["category"],
      shiftType: (entry.shiftType === "morning" || entry.shiftType === "evening" || entry.shiftType === "custom" ? entry.shiftType : null) as WorkerTimeEntryPayload["shiftType"],
      startTime: nullableTime(entry.startTime),
      endTime: nullableTime(entry.endTime),
    }))
    .filter((entry) => Number.isInteger(entry.workerId) && entry.workerId > 0);
}

export function normalizeMachineMthEntries(entries: unknown): MachineMthEntryPayload[] {
  return parseJsonArray<Record<string, unknown>>(typeof entries === "string" ? entries : JSON.stringify(entries ?? []))
    .map((entry) => {
      const mthStart = finiteNumber(entry.mthStart);
      const mthEnd = finiteNumber(entry.mthEnd);
      const mthTotal = calculateDerivedTotal(mthStart, mthEnd) ?? finiteNumber(entry.mthTotal);
      return {
        machineId: Number(entry.machineId),
        accessoryId: Number.isInteger(Number(entry.accessoryId)) && Number(entry.accessoryId) > 0 ? Number(entry.accessoryId) : null,
        operatorId: Number.isInteger(Number(entry.operatorId)) && Number(entry.operatorId) > 0 ? Number(entry.operatorId) : null,
        startTime: nullableTime(entry.startTime),
        endTime: nullableTime(entry.endTime),
        mthStart,
        mthEnd,
        mthTotal,
        fuelConsumption: finiteNumber(entry.fuelConsumption),
        refueling: finiteNumber(entry.refueling),
      };
    })
    .filter((entry) => Number.isInteger(entry.machineId) && entry.machineId > 0);
}

export function normalizeVehicleEntries(entries: unknown): VehicleEntryPayload[] {
  return parseJsonArray<Record<string, unknown>>(typeof entries === "string" ? entries : JSON.stringify(entries ?? []))
    .map((entry) => {
      const kmStart = finiteNumber(entry.kmStart);
      const kmEnd = finiteNumber(entry.kmEnd);
      return {
        vehicleId: Number(entry.vehicleId),
        kmStart,
        kmEnd,
        kmTotal: calculateDerivedTotal(kmStart, kmEnd) ?? finiteNumber(entry.kmTotal),
        refueling: finiteNumber(entry.refueling),
      };
    })
    .filter((entry) => Number.isInteger(entry.vehicleId) && entry.vehicleId > 0);
}

export function serializeJsonArray(value: unknown[] | null | undefined): string | null {
  if (!value?.length) return null;
  return JSON.stringify(value);
}

export function sumMachineMthTotals(entries: MachineMthEntryPayload[]): number | null {
  const totals = entries.map((entry) => entry.mthTotal).filter((value): value is number => value != null);
  if (!totals.length) return null;
  return Math.round(totals.reduce((sum, value) => sum + value, 0) * 100) / 100;
}

export function sumMachineValue(entries: MachineMthEntryPayload[], field: "fuelConsumption" | "refueling"): number | null {
  const values = entries.map((entry) => entry[field]).filter((value): value is number => value != null);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
}
