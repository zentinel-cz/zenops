import { Router, type NextFunction, type Request, type Response } from "express";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  db,
  machinesTable,
  mowingRecordMachinesTable,
  mowingRecordsTable,
  mowingRecordWorkersTable,
  regionsTable,
  usersTable,
  vehiclesTable,
  workersTable,
} from "@workspace/db";
import { logAudit } from "../lib/auditLog";
import { normalizeVehicleEntries, serializeIdList, serializeJsonArray, type VehicleEntryPayload } from "../lib/recordFields";
import { buildMowingRecord } from "./mowingRecords";

const router = Router();

type SessionData = { userId: number; userRole: string };
type CoreStatus = "draft" | "submitted" | "approved";

type CorePayload = {
  date?: string;
  regionId?: number;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes?: number | null;
  coreWorkType?: string | null;
  performanceValue?: number | null;
  performanceUnit?: string | null;
  machineId?: number | null;
  mthStart?: number | null;
  mthEnd?: number | null;
  fuelConsumption?: number | null;
  brushcutterRefueling?: number | null;
  serviceNote?: string | null;
  vehicleEntries?: VehicleEntryPayload[] | null;
  note?: string | null;
};

const workTypes = new Set(["vyzinani", "seceni_burene", "cisteni_porostu", "udrzba_cest", "ostatni"]);
const performanceUnits = new Set(["ha", "m2", "hod"]);

function sessionOf(req: unknown): SessionData {
  return (req as { session: SessionData }).session;
}

function requireCoreAccess(req: Request, res: Response, next: NextFunction): void {
  const session = sessionOf(req);
  if (!session?.userId) { res.status(401).json({ error: "Nepřihlášen" }); return; }
  if (!["admin", "manager", "brushcutter"].includes(session.userRole)) {
    res.status(403).json({ error: "Tato část aplikace pro vaši roli není zpřístupněna" });
    return;
  }
  next();
}

function routeId(value: string | string[] | undefined): number {
  return Number(Array.isArray(value) ? value[0] : value);
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function nonNegative(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

function laborHours(startTime: string, endTime: string, breakMinutes: number): number | null {
  const parse = (value: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const start = parse(startTime);
  const rawEnd = parse(endTime);
  if (start == null || rawEnd == null) return null;
  const end = rawEnd <= start ? rawEnd + 24 * 60 : rawEnd;
  const worked = end - start - breakMinutes;
  return worked > 0 ? Math.round((worked / 60) * 100) / 100 : null;
}

async function linkedBrushcutter(userId: number) {
  const [row] = await db
    .select({ workerId: usersTable.workerId, fullName: usersTable.fullName })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.role, "brushcutter"), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .limit(1);
  return row;
}

async function validatePayload(payload: CorePayload, ownerUserId: number) {
  const owner = await linkedBrushcutter(ownerUserId);
  if (!owner?.workerId) return { error: "Účet Křováka není propojený s aktivním pracovním profilem" } as const;

  const date = payload.date?.slice(0, 10) ?? "";
  const regionId = Number(payload.regionId);
  const location = cleanText(payload.location);
  const startTime = payload.startTime ?? "";
  const endTime = payload.endTime ?? "";
  const breakMinutes = nonNegative(payload.breakMinutes) ?? 0;
  const coreWorkType = payload.coreWorkType ?? "";
  const performanceValue = nonNegative(payload.performanceValue);
  const performanceUnit = payload.performanceUnit ?? null;
  const machineId = payload.machineId ? Number(payload.machineId) : null;
  const mthStart = nonNegative(payload.mthStart);
  const mthEnd = nonNegative(payload.mthEnd);
  const fuelConsumption = nonNegative(payload.fuelConsumption);
  const brushcutterRefueling = nonNegative(payload.brushcutterRefueling);
  const vehicleEntries = normalizeVehicleEntries(payload.vehicleEntries ?? []);
  const hours = laborHours(startTime, endTime, breakMinutes);

  if (!date || !regionId || !location || !startTime || !endTime || !coreWorkType) return { error: "Vyplňte datum, revír, místo, začátek, konec a druh práce" } as const;
  if (!workTypes.has(coreWorkType)) return { error: "Vyberte platný druh práce" } as const;
  if (!Number.isFinite(breakMinutes) || hours == null) return { error: "Zadejte platnou pracovní dobu a přestávku" } as const;
  if (performanceValue != null && (!Number.isFinite(performanceValue) || !performanceUnit || !performanceUnits.has(performanceUnit))) return { error: "K výkonu vyberte platnou jednotku" } as const;
  if (performanceValue == null && performanceUnit) return { error: "K jednotce doplňte hodnotu výkonu" } as const;
  if ([mthStart, mthEnd, fuelConsumption, brushcutterRefueling].some((value) => value != null && !Number.isFinite(value))) return { error: "Technické hodnoty nesmí být záporné" } as const;
  if (mthStart != null && mthEnd != null && mthEnd < mthStart) return { error: "Konečný stav motohodin nesmí být nižší než počáteční" } as const;
  if (vehicleEntries.some((entry) => !entry.vehicleId || (entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart) || (entry.refueling ?? 0) < 0)) return { error: "Doplňte platné údaje jízd aut" } as const;

  const [region] = await db.select({ id: regionsTable.id }).from(regionsTable).where(and(eq(regionsTable.id, regionId), eq(regionsTable.isActive, true), isNull(regionsTable.deletedAt))).limit(1);
  if (!region) return { error: "Vybraný revír není aktivní" } as const;

  if (machineId) {
    const [machine] = await db.select({ id: machinesTable.id }).from(machinesTable).where(and(eq(machinesTable.id, machineId), eq(machinesTable.mowingCategory, "brushcutter"), eq(machinesTable.isActive, true), isNull(machinesTable.deletedAt))).limit(1);
    if (!machine) return { error: "Vybraný křovinořez není aktivní nebo není správně zařazený" } as const;
  }

  if (vehicleEntries.length) {
    const ids = [...new Set(vehicleEntries.map((entry) => entry.vehicleId))];
    const vehicles = await db.select({ id: vehiclesTable.id }).from(vehiclesTable).where(and(inArray(vehiclesTable.id, ids), eq(vehiclesTable.isActive, true), isNull(vehiclesTable.deletedAt)));
    if (vehicles.length !== ids.length) return { error: "Některé vybrané vozidlo není aktivní" } as const;
  }

  return {
    value: {
      date, regionId, location, startTime, endTime, breakMinutes, coreWorkType,
      performanceValue, performanceUnit: performanceValue == null ? null : performanceUnit,
      machineId, mthStart, mthEnd,
      mthTotal: mthStart != null && mthEnd != null ? Math.round((mthEnd - mthStart) * 100) / 100 : null,
      fuelConsumption, brushcutterRefueling,
      serviceNote: cleanText(payload.serviceNote), note: cleanText(payload.note), vehicleEntries,
      vehicleKmTotal: vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.kmTotal ?? 0), 0) * 100) / 100 : null,
      vehicleRefueling: vehicleEntries.length ? Math.round(vehicleEntries.reduce((sum, entry) => sum + (entry.refueling ?? 0), 0) * 100) / 100 : null,
      workerId: owner.workerId, laborHours: hours,
    },
  } as const;
}

async function getCoreRecord(id: number) {
  const [record] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), eq(mowingRecordsTable.mowingKind, "rucni"), eq(mowingRecordsTable.manualMowingKind, "core"), isNull(mowingRecordsTable.deletedAt))).limit(1);
  return record;
}

async function canManagerAccess(record: typeof mowingRecordsTable.$inferSelect) {
  const [owner] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, record.userId)).limit(1);
  return owner?.role === "brushcutter";
}

router.get("/core-mowing-records", requireCoreAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const conditions = [eq(mowingRecordsTable.mowingKind, "rucni"), eq(mowingRecordsTable.manualMowingKind, "core"), isNull(mowingRecordsTable.deletedAt)];
  if (session.userRole === "brushcutter") conditions.push(eq(mowingRecordsTable.userId, session.userId));
  if (session.userRole === "manager") {
    const owners = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "brushcutter"));
    if (!owners.length) { res.json([]); return; }
    conditions.push(inArray(mowingRecordsTable.userId, owners.map((owner) => owner.id)));
  }
  const records = await db.select().from(mowingRecordsTable).where(and(...conditions)).orderBy(mowingRecordsTable.date);
  res.json(await Promise.all(records.map(buildMowingRecord)));
});

router.post("/core-mowing-records", requireCoreAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  if (session.userRole !== "brushcutter") { res.status(403).json({ error: "Denní záznam může vytvořit pouze Křovák" }); return; }
  const validated = await validatePayload(req.body as CorePayload, session.userId);
  if ("error" in validated) { res.status(400).json({ error: validated.error }); return; }
  const value = validated.value;

  const record = await db.transaction(async (tx) => {
    const [created] = await tx.insert(mowingRecordsTable).values({
      date: value.date, userId: session.userId, regionId: value.regionId, workType: "seceni", mowingSection: "manual", mowingKind: "rucni", manualMowingKind: "core",
      location: value.location, startTime: value.startTime, endTime: value.endTime, breakMinutes: value.breakMinutes, coreWorkType: value.coreWorkType,
      performanceValue: value.performanceValue == null ? null : String(value.performanceValue), performanceUnit: value.performanceUnit,
      mthStart: value.mthStart == null ? null : String(value.mthStart), mthEnd: value.mthEnd == null ? null : String(value.mthEnd), mthTotal: value.mthTotal == null ? null : String(value.mthTotal),
      fuelConsumption: value.fuelConsumption == null ? null : String(value.fuelConsumption), brushcutterRefueling: value.brushcutterRefueling == null ? null : String(value.brushcutterRefueling),
      manualWorkerIds: serializeIdList([value.workerId]), machineWorkerIds: serializeIdList([]),
      workerTimeEntries: serializeJsonArray([{ workerId: value.workerId, category: "manual" as const, shiftType: "custom" as const, startTime: value.startTime, endTime: value.endTime }]),
      machineMthEntries: serializeJsonArray(value.machineId ? [{ machineId: value.machineId, operatorId: value.workerId, mthStart: value.mthStart, mthEnd: value.mthEnd, mthTotal: value.mthTotal, fuelConsumption: value.fuelConsumption, refueling: null }] : []),
      vehicleEntries: serializeJsonArray(value.vehicleEntries), vehicleKmTotal: value.vehicleKmTotal == null ? null : String(value.vehicleKmTotal), vehicleRefueling: value.vehicleRefueling == null ? null : String(value.vehicleRefueling),
      laborHours: String(value.laborHours), serviceNote: value.serviceNote, note: value.note, coreStatus: "draft",
    }).returning();
    await tx.insert(mowingRecordWorkersTable).values({ mowingRecordId: created.id, workerId: value.workerId });
    if (value.machineId) await tx.insert(mowingRecordMachinesTable).values({ mowingRecordId: created.id, machineId: value.machineId });
    return created;
  });

  await logAudit({ userId: session.userId, action: "create", tableName: "mowing_records", recordId: record.id, description: `Křovák vytvořil denní záznam ${record.date} – ${record.location}`, newData: record as Record<string, unknown> });
  res.status(201).json(await buildMowingRecord(record));
});

router.put("/core-mowing-records/:id", requireCoreAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const existing = await getCoreRecord(id);
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }
  if (!(await canManagerAccess(existing))) { res.status(403).json({ error: "Tento záznam nepatří Křovákovi" }); return; }
  if (session.userRole === "brushcutter" && (existing.userId !== session.userId || (existing.coreStatus ?? "draft") !== "draft")) {
    res.status(403).json({ error: "Křovák může upravit pouze svůj rozpracovaný záznam" }); return;
  }
  const validated = await validatePayload(req.body as CorePayload, existing.userId);
  if ("error" in validated) { res.status(400).json({ error: validated.error }); return; }
  const value = validated.value;

  const record = await db.transaction(async (tx) => {
    const [updated] = await tx.update(mowingRecordsTable).set({
      date: value.date, regionId: value.regionId, location: value.location, startTime: value.startTime, endTime: value.endTime, breakMinutes: value.breakMinutes, coreWorkType: value.coreWorkType,
      performanceValue: value.performanceValue == null ? null : String(value.performanceValue), performanceUnit: value.performanceUnit,
      mthStart: value.mthStart == null ? null : String(value.mthStart), mthEnd: value.mthEnd == null ? null : String(value.mthEnd), mthTotal: value.mthTotal == null ? null : String(value.mthTotal),
      fuelConsumption: value.fuelConsumption == null ? null : String(value.fuelConsumption), brushcutterRefueling: value.brushcutterRefueling == null ? null : String(value.brushcutterRefueling),
      manualWorkerIds: serializeIdList([value.workerId]), machineWorkerIds: serializeIdList([]),
      workerTimeEntries: serializeJsonArray([{ workerId: value.workerId, category: "manual" as const, shiftType: "custom" as const, startTime: value.startTime, endTime: value.endTime }]),
      machineMthEntries: serializeJsonArray(value.machineId ? [{ machineId: value.machineId, operatorId: value.workerId, mthStart: value.mthStart, mthEnd: value.mthEnd, mthTotal: value.mthTotal, fuelConsumption: value.fuelConsumption, refueling: null }] : []),
      vehicleEntries: serializeJsonArray(value.vehicleEntries), vehicleKmTotal: value.vehicleKmTotal == null ? null : String(value.vehicleKmTotal), vehicleRefueling: value.vehicleRefueling == null ? null : String(value.vehicleRefueling),
      laborHours: String(value.laborHours), serviceNote: value.serviceNote, note: value.note,
    }).where(eq(mowingRecordsTable.id, id)).returning();
    await tx.delete(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, id));
    if (value.machineId) await tx.insert(mowingRecordMachinesTable).values({ mowingRecordId: id, machineId: value.machineId });
    return updated;
  });

  await logAudit({ userId: session.userId, action: "update", tableName: "mowing_records", recordId: id, description: `${session.userRole === "brushcutter" ? "Křovák" : "Vedoucí"} upravil denní záznam ${record.date} – ${record.location}`, oldData: existing as Record<string, unknown>, newData: record as Record<string, unknown> });
  res.json(await buildMowingRecord(record));
});

router.patch("/core-mowing-records/:id/status", requireCoreAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const nextStatus = (req.body as { status?: CoreStatus }).status;
  const existing = await getCoreRecord(id);
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }
  if (!(await canManagerAccess(existing))) { res.status(403).json({ error: "Tento záznam nepatří Křovákovi" }); return; }
  const currentStatus = (existing.coreStatus ?? "draft") as CoreStatus;
  if (session.userRole === "brushcutter") {
    if (existing.userId !== session.userId || currentStatus !== "draft" || nextStatus !== "submitted") { res.status(403).json({ error: "Křovák může pouze odevzdat svůj rozpracovaný záznam" }); return; }
  } else if (!(nextStatus === "approved" && currentStatus === "submitted") && !(nextStatus === "draft" && ["submitted", "approved"].includes(currentStatus))) {
    res.status(400).json({ error: "Neplatná změna stavu" }); return;
  }

  const now = new Date();
  const [record] = await db.update(mowingRecordsTable).set({
    coreStatus: nextStatus,
    coreSubmittedAt: nextStatus === "submitted" ? now : nextStatus === "draft" ? null : existing.coreSubmittedAt,
    coreApprovedAt: nextStatus === "approved" ? now : null,
    coreApprovedBy: nextStatus === "approved" ? session.userId : null,
  }).where(eq(mowingRecordsTable.id, id)).returning();

  const labels: Record<CoreStatus, string> = { draft: "Rozpracováno", submitted: "Odevzdáno", approved: "Schváleno" };
  await logAudit({ userId: session.userId, action: "update", tableName: "mowing_records", recordId: id, description: `Stav denního záznamu Křováka změněn: ${labels[currentStatus]} → ${labels[nextStatus!]}`, oldData: { coreStatus: currentStatus }, newData: { coreStatus: nextStatus, coreSubmittedAt: record.coreSubmittedAt, coreApprovedAt: record.coreApprovedAt, coreApprovedBy: record.coreApprovedBy } });
  res.json(await buildMowingRecord(record));
});

export default router;
