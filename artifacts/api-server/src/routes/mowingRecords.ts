import { Router, type NextFunction, type Request, type Response } from "express";
import { eq, isNull, and, gte, lte, inArray } from "drizzle-orm";
import { logAudit } from "../lib/auditLog";
import { queryString } from "../lib/query";
import {
  calculateDerivedTotal,
  normalizeMachineMthEntries,
  normalizeVehicleEntries,
  normalizeWorkerTimeEntries,
  parseDbNumber,
  parseIdList,
  serializeIdList,
  serializeJsonArray,
  sumMachineMthTotals,
  sumMachineValue,
  uniqueIds,
  type MachineMthEntryPayload,
  type VehicleEntryPayload,
  type WorkerTimeEntryPayload,
} from "../lib/recordFields";
import {
  db,
  mowingRecordsTable,
  mowingRecordWorkersTable,
  mowingRecordMachinesTable,
  mowingRecordAccessoriesTable,
  usersTable,
  regionsTable,
  weatherTypesTable,
  vehiclesTable,
  workersTable,
  machinesTable,
  accessoriesTable,
  contractorCompaniesTable,
} from "@workspace/db";

const router = Router();

type MowingSession = { userId: number; userRole: string };

function sessionOf(req: unknown): MowingSession {
  return (req as { session: MowingSession }).session;
}

function requireMowingAccess(req: Request, res: Response, next: NextFunction): void {
  const session = sessionOf(req);
  if (!session?.userId) { res.status(401).json({ error: "Nepřihlášen" }); return; }
  if (!session.userRole || !["admin", "manager", "brushcutter"].includes(session.userRole)) {
    res.status(403).json({ error: "Tato část aplikace pro vaši roli není zpřístupněna" });
    return;
  }
  next();
}

async function linkedWorkerId(userId: number): Promise<number | null> {
  const [user] = await db.select({ workerId: usersTable.workerId }).from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .limit(1);
  return user?.workerId ?? null;
}

async function activeUserRole(userId: number): Promise<string | null> {
  const [user] = await db.select({ role: usersTable.role }).from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .limit(1);
  return user?.role ?? null;
}

function getFallbackWorkerTimeEntries(record: typeof mowingRecordsTable.$inferSelect, workerIds: number[], manualWorkerIds: number[], machineWorkerIds: number[]) {
  return workerIds.map((workerId) => ({
    workerId,
    category: machineWorkerIds.includes(workerId) ? "machine" : "manual",
    startTime: record.startTime ?? null,
    endTime: record.endTime ?? null,
  })) satisfies WorkerTimeEntryPayload[];
}

function getFallbackMachineMthEntries(record: typeof mowingRecordsTable.$inferSelect, machineIds: number[]) {
  const mthStart = parseDbNumber(record.mthStart);
  const mthEnd = parseDbNumber(record.mthEnd);
  const mthTotal = calculateDerivedTotal(mthStart, mthEnd) ?? parseDbNumber(record.mthTotal);
  return machineIds.map((machineId) => ({
    machineId,
    accessoryId: null,
    operatorId: null,
    startTime: record.startTime ?? null,
    endTime: record.endTime ?? null,
    mthStart: machineIds.length === 1 ? mthStart : null,
    mthEnd: machineIds.length === 1 ? mthEnd : null,
    mthTotal: machineIds.length === 1 ? mthTotal : null,
    fuelConsumption: machineIds.length === 1 ? parseDbNumber(record.fuelConsumption) : null,
    refueling: machineIds.length === 1 ? parseDbNumber(record.refueling) : null,
  })) satisfies MachineMthEntryPayload[];
}

async function buildMowingRecord(record: typeof mowingRecordsTable.$inferSelect) {
  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, fullName: usersTable.fullName, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt })
    .from(usersTable)
    .where(eq(usersTable.id, record.userId));

  const [region] = await db.select().from(regionsTable).where(eq(regionsTable.id, record.regionId));

  const resolvedWeatherTypeIds = parseIdList(record.weatherTypeIds).length
    ? parseIdList(record.weatherTypeIds)
    : record.weatherTypeId
      ? [record.weatherTypeId]
      : [];
  const weatherTypes = resolvedWeatherTypeIds.length > 0
    ? await db.select().from(weatherTypesTable).where(inArray(weatherTypesTable.id, resolvedWeatherTypeIds))
    : [];
  const weatherType = record.weatherTypeId
    ? weatherTypes.find((item) => item.id === record.weatherTypeId) ?? null
    : weatherTypes[0] ?? null;

  const storedVehicleEntries = normalizeVehicleEntries(record.vehicleEntries);
  const resolvedVehicleEntries = storedVehicleEntries.length > 0
    ? storedVehicleEntries
    : record.vehicleId
      ? [{
          vehicleId: record.vehicleId,
          kmStart: parseDbNumber(record.vehicleKmStart),
          kmEnd: parseDbNumber(record.vehicleKmEnd),
          kmTotal: parseDbNumber(record.vehicleKmTotal),
          refueling: parseDbNumber(record.vehicleRefueling),
        }]
      : [];
  const vehicleIds = uniqueIds(resolvedVehicleEntries.map((entry) => entry.vehicleId));
  const vehicles = vehicleIds.length > 0 ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.id, vehicleIds)) : [];
  const vehicle = record.vehicleId ? vehicles.find((item) => item.id === record.vehicleId) ?? null : vehicles[0] ?? null;

  const workerLinks = await db.select().from(mowingRecordWorkersTable).where(eq(mowingRecordWorkersTable.mowingRecordId, record.id));
  const workerIds = workerLinks.map((w) => w.workerId);
  const workers = workerIds.length > 0 ? await db.select().from(workersTable).where(inArray(workersTable.id, workerIds)) : [];

  const manualWorkerIds = parseIdList(record.manualWorkerIds).length ? parseIdList(record.manualWorkerIds) : workerIds;
  const machineWorkerIds = parseIdList(record.machineWorkerIds);
  const manualWorkers = manualWorkerIds.length > 0 ? workers.filter((worker) => manualWorkerIds.includes(worker.id)) : [];
  const machineWorkers = machineWorkerIds.length > 0 ? workers.filter((worker) => machineWorkerIds.includes(worker.id)) : [];

  const machineLinks = await db.select().from(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, record.id));
  const machineIds = machineLinks.map((m) => m.machineId);
  const machines = machineIds.length > 0 ? await db.select().from(machinesTable).where(inArray(machinesTable.id, machineIds)) : [];

  const accessoryLinks = await db.select().from(mowingRecordAccessoriesTable).where(eq(mowingRecordAccessoriesTable.mowingRecordId, record.id));
  const accessoryIds = accessoryLinks.map((a) => a.accessoryId);
  const accessories = accessoryIds.length > 0 ? await db.select().from(accessoriesTable).where(inArray(accessoriesTable.id, accessoryIds)) : [];

  const workerTimeEntries = normalizeWorkerTimeEntries(record.workerTimeEntries)
    .filter((entry) => workerIds.includes(entry.workerId));
  const resolvedWorkerTimeEntries = workerTimeEntries.length > 0
    ? workerTimeEntries
    : getFallbackWorkerTimeEntries(record, workerIds, manualWorkerIds, machineWorkerIds);
  const machineMthEntries = normalizeMachineMthEntries(record.machineMthEntries)
    .filter((entry) => machineIds.includes(entry.machineId));
  const resolvedMachineMthEntries = (machineMthEntries.length > 0
    ? machineMthEntries
    : getFallbackMachineMthEntries(record, machineIds))
    .map((entry) => ({
      ...entry,
      accessoryId: entry.accessoryId ?? (machineIds.length === 1 ? accessoryIds[0] ?? null : null),
      operatorId: entry.operatorId ?? (machineIds.length === 1 ? machineWorkerIds[0] ?? null : null),
    }));
  const aggregateMthTotal = sumMachineMthTotals(resolvedMachineMthEntries) ?? parseDbNumber(record.mthTotal);
  const singleMachineEntry = resolvedMachineMthEntries.length === 1 ? resolvedMachineMthEntries[0] : null;
  const [contractorCompany] = record.contractorCompanyId
    ? await db.select().from(contractorCompaniesTable).where(eq(contractorCompaniesTable.id, record.contractorCompanyId))
    : [];

  return {
    ...record,
    temperature: record.temperature ?? null,
    weatherTypeIds: resolvedWeatherTypeIds,
    weatherTypes,
    mthStart: singleMachineEntry?.mthStart ?? parseDbNumber(record.mthStart),
    mthEnd: singleMachineEntry?.mthEnd ?? parseDbNumber(record.mthEnd),
    mthTotal: aggregateMthTotal,
    fuelConsumption: sumMachineValue(resolvedMachineMthEntries, "fuelConsumption") ?? parseDbNumber(record.fuelConsumption),
    refueling: sumMachineValue(resolvedMachineMthEntries, "refueling") ?? parseDbNumber(record.refueling),
    brushcutterRefueling: parseDbNumber(record.brushcutterRefueling),
    dayHours: parseDbNumber(record.dayHours),
    nightHours: parseDbNumber(record.nightHours),
    laborHours: parseDbNumber(record.laborHours),
    vehicleKmStart: parseDbNumber(record.vehicleKmStart),
    vehicleKmEnd: parseDbNumber(record.vehicleKmEnd),
    vehicleKmTotal: parseDbNumber(record.vehicleKmTotal),
    vehicleRefueling: parseDbNumber(record.vehicleRefueling),
    vehicleEntries: resolvedVehicleEntries.map((entry) => ({
      ...entry,
      vehicle: vehicles.find((vehicleItem) => vehicleItem.id === entry.vehicleId) ?? null,
    })),
    manualWorkerIds,
    machineWorkerIds,
    workerIds,
    machineIds,
    accessoryIds,
    workerTimeEntries: resolvedWorkerTimeEntries.map((entry) => ({
      ...entry,
      worker: workers.find((worker) => worker.id === entry.workerId) ?? null,
    })),
    machineMthEntries: resolvedMachineMthEntries.map((entry) => ({
      ...entry,
      machine: machines.find((machine) => machine.id === entry.machineId) ?? null,
      accessory: accessories.find((accessory) => accessory.id === entry.accessoryId) ?? null,
      operator: workers.find((worker) => worker.id === entry.operatorId) ?? null,
    })),
    user,
    region,
    weatherType,
    vehicle,
    workers,
    manualWorkers,
    machineWorkers,
    contractorCompany: contractorCompany ?? null,
    machines,
    accessories,
  };
}

router.get("/mowing-records", requireMowingAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const filterUserId = queryString(req.query.userId);
  const dateFrom = queryString(req.query.dateFrom);
  const dateTo = queryString(req.query.dateTo);
  const regionId = queryString(req.query.regionId);

  const conditions = [isNull(mowingRecordsTable.deletedAt)];

  if (session.userRole === "brushcutter") {
    conditions.push(eq(mowingRecordsTable.userId, session.userId));
    conditions.push(eq(mowingRecordsTable.mowingKind, "rucni"), eq(mowingRecordsTable.manualMowingKind, "core"));
  } else if (session.userRole === "manager") {
    const brushcutterUsers = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.role, "brushcutter"), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)));
    if (brushcutterUsers.length === 0) { res.json([]); return; }
    conditions.push(inArray(mowingRecordsTable.userId, brushcutterUsers.map((user) => user.id)));
    conditions.push(eq(mowingRecordsTable.mowingKind, "rucni"), eq(mowingRecordsTable.manualMowingKind, "core"));
  } else if (filterUserId) {
    conditions.push(eq(mowingRecordsTable.userId, parseInt(filterUserId, 10)));
  }

  if (dateFrom) conditions.push(gte(mowingRecordsTable.date, dateFrom));
  if (dateTo) conditions.push(lte(mowingRecordsTable.date, dateTo));
  if (regionId) conditions.push(eq(mowingRecordsTable.regionId, parseInt(regionId, 10)));

  const records = await db
    .select()
    .from(mowingRecordsTable)
    .where(and(...conditions))
    .orderBy(mowingRecordsTable.date);

  res.json(await Promise.all(records.map(buildMowingRecord)));
});

router.post("/mowing-records", requireMowingAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const {
    date, regionId, workType, mowingSection, mowingKind, manualMowingKind, contractorCompanyId, location, startTime, endTime,
    weatherTypeId, weatherTypeIds, temperature, vehicleId, vehicleEntries,
    mthStart, mthEnd, mthTotal, fuelConsumption, refueling,
    manualWorkerIds, machineWorkerIds, workerIds, machineIds, accessoryIds,
    workerTimeEntries, machineMthEntries,
    assignedAverage, dayHours, nightHours, laborHours,
    vehicleKmStart, vehicleKmEnd, vehicleKmTotal, vehicleRefueling, brushcutterRefueling,
    trafficMarking, note,
  } = req.body as {
    date?: string;
    regionId?: number;
    workType?: string | null;
    mowingSection?: string | null;
    mowingKind?: string | null;
    manualMowingKind?: string | null;
    contractorCompanyId?: number | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    weatherTypeIds?: number[] | null;
    temperature?: number | null;
    vehicleId?: number | null;
    vehicleEntries?: VehicleEntryPayload[] | null;
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    manualWorkerIds?: number[] | null;
    machineWorkerIds?: number[] | null;
    workerIds?: number[] | null;
    machineIds?: number[];
    accessoryIds?: number[];
    workerTimeEntries?: WorkerTimeEntryPayload[] | null;
    machineMthEntries?: MachineMthEntryPayload[] | null;
    assignedAverage?: string | null;
    dayHours?: number | null;
    nightHours?: number | null;
    laborHours?: number | null;
    vehicleKmStart?: number | null;
    vehicleKmEnd?: number | null;
    vehicleKmTotal?: number | null;
    vehicleRefueling?: number | null;
    brushcutterRefueling?: number | null;
    trafficMarking?: string | null;
    note?: string | null;
  };

  if (!date || !regionId) {
    res.status(400).json({ error: "Datum a revír jsou povinné" });
    return;
  }
  if (session.userRole === "manager") {
    res.status(403).json({ error: "Vedoucí může záznamy Křováků upravovat, nikoli vytvářet" });
    return;
  }
  if (session.userRole === "brushcutter" && (mowingKind !== "rucni" || manualMowingKind !== "core")) {
    res.status(403).json({ error: "Křovák může vytvořit pouze vlastní kmenový záznam" });
    return;
  }

  const normalizedWorkerTimeEntries = normalizeWorkerTimeEntries(workerTimeEntries ?? []);
  const normalizedMachineMthEntries = normalizeMachineMthEntries(machineMthEntries ?? []);
  const normalizedVehicleEntries = normalizeVehicleEntries(vehicleEntries ?? (vehicleId ? [{ vehicleId, kmStart: vehicleKmStart, kmEnd: vehicleKmEnd, kmTotal: vehicleKmTotal, refueling: vehicleRefueling }] : []));
  const derivedManualWorkerIds = normalizedWorkerTimeEntries.filter((entry) => entry.category === "manual").map((entry) => entry.workerId);
  const derivedMachineWorkerIds = normalizedWorkerTimeEntries.filter((entry) => entry.category === "machine").map((entry) => entry.workerId);
  const entryOperatorIds = normalizedMachineMthEntries.flatMap((entry) => entry.operatorId != null ? [entry.operatorId] : []);
  const entryAccessoryIds = normalizedMachineMthEntries.flatMap((entry) => entry.accessoryId != null ? [entry.accessoryId] : []);
  const derivedMachineIds = normalizedMachineMthEntries.map((entry) => entry.machineId);
  const nextManualWorkerIds = workerTimeEntries !== undefined ? derivedManualWorkerIds : (manualWorkerIds ?? []);
  const nextMachineWorkerIds = uniqueIds(workerTimeEntries !== undefined ? derivedMachineWorkerIds : (machineWorkerIds ?? []), entryOperatorIds);
  const nextMachineIds = machineMthEntries !== undefined ? derivedMachineIds : (machineIds ?? []);
  const nextAccessoryIds = uniqueIds(accessoryIds ?? [], entryAccessoryIds);
  const mergedWorkerIds = uniqueIds(workerIds ?? [], nextManualWorkerIds, nextMachineWorkerIds);
  const mergedWeatherTypeIds = uniqueIds(weatherTypeIds ?? [], weatherTypeId != null ? [weatherTypeId] : []);
  const aggregateMthTotal = sumMachineMthTotals(normalizedMachineMthEntries) ?? calculateDerivedTotal(mthStart, mthEnd) ?? mthTotal ?? null;
  const aggregateFuelConsumption = sumMachineValue(normalizedMachineMthEntries, "fuelConsumption") ?? fuelConsumption ?? null;
  const aggregateRefueling = sumMachineValue(normalizedMachineMthEntries, "refueling") ?? refueling ?? null;
  const singleMachineEntry = normalizedMachineMthEntries.length === 1 ? normalizedMachineMthEntries[0] : null;
  const singleVehicleEntry = normalizedVehicleEntries.length === 1 ? normalizedVehicleEntries[0] : null;
  const aggregateVehicleKm = normalizedVehicleEntries.length ? Math.round(normalizedVehicleEntries.reduce((sum, entry) => sum + (entry.kmTotal ?? 0), 0) * 100) / 100 : null;
  const aggregateVehicleRefueling = normalizedVehicleEntries.length ? Math.round(normalizedVehicleEntries.reduce((sum, entry) => sum + (entry.refueling ?? 0), 0) * 100) / 100 : null;

  if (mowingKind === "strojni") {
    if (normalizedMachineMthEntries.length === 0) {
      res.status(400).json({ error: "Pro strojní sečení přidejte alespoň jeden traktor" });
      return;
    }
    if (new Set(nextMachineIds).size !== nextMachineIds.length) {
      res.status(400).json({ error: "Každý traktor lze do denního záznamu přidat pouze jednou" });
      return;
    }
    if (normalizedMachineMthEntries.some((entry) => entry.operatorId == null)) {
      res.status(400).json({ error: "U každého traktoru vyberte obsluhu" });
      return;
    }
    if (normalizedMachineMthEntries.some((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthEnd < entry.mthStart)) {
      res.status(400).json({ error: "U každého traktoru vyplňte platné počáteční a konečné motohodiny" });
      return;
    }
    if ((aggregateFuelConsumption ?? 0) < 0 || (aggregateRefueling ?? 0) < 0) {
      res.status(400).json({ error: "Spotřeba ani tankování nesmí být záporné" });
      return;
    }
  }
  if (mowingKind === "rucni") {
    const brushcutterCore = session.userRole === "brushcutter" && manualMowingKind === "core";
    if (session.userRole !== "admin" && !brushcutterCore) { res.status(403).json({ error: "Tento typ ručního sečení nemáte oprávnění evidovat" }); return; }
    if (brushcutterCore) {
      const workerId = await linkedWorkerId(session.userId);
      if (!workerId) { res.status(409).json({ error: "Účet není propojený s pracovním profilem" }); return; }
      if (nextManualWorkerIds.length !== 1 || nextManualWorkerIds[0] !== workerId || mergedWorkerIds.some((id) => id !== workerId) || nextMachineWorkerIds.length > 0) {
        res.status(403).json({ error: "Křovák může evidovat pouze svůj vlastní kmenový záznam" }); return;
      }
    }
    if (manualMowingKind === "core" && nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho kmenového pracovníka" }); return; }
    if (manualMowingKind === "slope") {
      if (normalizedMachineMthEntries.length === 0) { res.status(400).json({ error: "Přidejte alespoň jednu svahovou sekačku" }); return; }
      if (normalizedMachineMthEntries.some((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthEnd < entry.mthStart)) { res.status(400).json({ error: "U každé svahové sekačky vyplňte platné motohodiny" }); return; }
      if (nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho pracovníka" }); return; }
    }
    if (manualMowingKind === "subcontractor") {
      if (!contractorCompanyId) { res.status(400).json({ error: "Vyberte subdodavatelskou firmu" }); return; }
      if (nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho pracovníka subdodavatele" }); return; }
      const [company] = await db.select().from(contractorCompaniesTable).where(and(eq(contractorCompaniesTable.id, contractorCompanyId), eq(contractorCompaniesTable.isActive, true), isNull(contractorCompaniesTable.deletedAt)));
      if (!company) { res.status(400).json({ error: "Vybraná subdodavatelská firma není aktivní" }); return; }
      const selectedWorkers = await db.select({ id: workersTable.id, contractorCompanyId: workersTable.contractorCompanyId }).from(workersTable).where(inArray(workersTable.id, nextManualWorkerIds));
      if (selectedWorkers.length !== nextManualWorkerIds.length || selectedWorkers.some((worker) => worker.contractorCompanyId !== contractorCompanyId)) { res.status(400).json({ error: "Všichni pracovníci musí patřit k vybrané firmě" }); return; }
    }
    if (!manualMowingKind || !["core", "slope", "subcontractor"].includes(manualMowingKind)) { res.status(400).json({ error: "Vyberte variantu ručního sečení" }); return; }
    if ((brushcutterRefueling ?? 0) < 0) { res.status(400).json({ error: "Tankování křovinořezů nesmí být záporné" }); return; }
  }
  if (normalizedVehicleEntries.some((entry) => (entry.kmStart ?? 0) < 0 || (entry.kmEnd ?? 0) < 0 || (entry.refueling ?? 0) < 0 || (entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart))) {
    res.status(400).json({ error: "U každé jízdy auta zadejte platné kilometry a tankování" });
    return;
  }

  const [record] = await db.insert(mowingRecordsTable).values({
    date,
    userId: session.userId,
    regionId,
    workType: workType ?? null,
    mowingSection: mowingSection ?? null,
    mowingKind: mowingKind ?? null,
    manualMowingKind: manualMowingKind ?? null,
    contractorCompanyId: manualMowingKind === "subcontractor" ? contractorCompanyId ?? null : null,
    location: location ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    weatherTypeId: mergedWeatherTypeIds[0] ?? weatherTypeId ?? null,
    weatherTypeIds: serializeIdList(mergedWeatherTypeIds),
    temperature: temperature ?? null,
    vehicleId: singleVehicleEntry?.vehicleId ?? null,
    vehicleEntries: serializeJsonArray(normalizedVehicleEntries),
    mthStart: singleMachineEntry?.mthStart != null ? String(singleMachineEntry.mthStart) : mthStart != null ? String(mthStart) : null,
    mthEnd: singleMachineEntry?.mthEnd != null ? String(singleMachineEntry.mthEnd) : mthEnd != null ? String(mthEnd) : null,
    mthTotal: aggregateMthTotal != null ? String(aggregateMthTotal) : null,
    fuelConsumption: aggregateFuelConsumption != null ? String(aggregateFuelConsumption) : null,
    refueling: aggregateRefueling != null ? String(aggregateRefueling) : null,
    manualWorkerIds: serializeIdList(nextManualWorkerIds),
    machineWorkerIds: serializeIdList(nextMachineWorkerIds),
    workerTimeEntries: serializeJsonArray(normalizedWorkerTimeEntries),
    machineMthEntries: serializeJsonArray(normalizedMachineMthEntries),
    assignedAverage: assignedAverage ?? null,
    dayHours: dayHours != null ? String(dayHours) : null,
    nightHours: nightHours != null ? String(nightHours) : null,
    laborHours: laborHours != null ? String(laborHours) : null,
    vehicleKmStart: singleVehicleEntry?.kmStart != null ? String(singleVehicleEntry.kmStart) : null,
    vehicleKmEnd: singleVehicleEntry?.kmEnd != null ? String(singleVehicleEntry.kmEnd) : null,
    vehicleKmTotal: aggregateVehicleKm != null ? String(aggregateVehicleKm) : null,
    vehicleRefueling: aggregateVehicleRefueling != null ? String(aggregateVehicleRefueling) : null,
    brushcutterRefueling: brushcutterRefueling != null ? String(brushcutterRefueling) : null,
    trafficMarking: trafficMarking ?? null,
    note: note ?? null,
  }).returning();

  if (mergedWorkerIds.length > 0) {
    await db.insert(mowingRecordWorkersTable).values(mergedWorkerIds.map((workerId) => ({ mowingRecordId: record.id, workerId })));
  }
  if (nextMachineIds.length > 0) {
    await db.insert(mowingRecordMachinesTable).values(nextMachineIds.map((machineId) => ({ mowingRecordId: record.id, machineId })));
  }
  if (nextAccessoryIds.length > 0) {
    await db.insert(mowingRecordAccessoriesTable).values(nextAccessoryIds.map((accessoryId) => ({ mowingRecordId: record.id, accessoryId })));
  }

  const full = await buildMowingRecord(record);

  await logAudit({
    userId: session.userId,
    action: "create",
    tableName: "mowing_records",
    recordId: record.id,
    description: `Vytvořen záznam sečení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    newData: { date: record.date, regionId: record.regionId, workType: record.workType, workerIds: mergedWorkerIds, machineIds: nextMachineIds, accessoryIds: nextAccessoryIds, weatherTypeIds: mergedWeatherTypeIds, workerTimeEntries: normalizedWorkerTimeEntries, machineMthEntries: normalizedMachineMthEntries, vehicleEntries: normalizedVehicleEntries },
  });

  res.status(201).json(full);
});

router.get("/mowing-records/:id", requireMowingAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [record] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!record) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole === "manager") {
    const creatorRole = await activeUserRole(record.userId);
    if (creatorRole !== "brushcutter" || record.mowingKind !== "rucni" || record.manualMowingKind !== "core") {
      res.status(403).json({ error: "Vedoucí může zobrazit pouze denní záznamy Křováků" }); return;
    }
  } else if (session.userRole !== "admin" && record.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }
  if (session.userRole === "brushcutter" && (record.mowingKind !== "rucni" || record.manualMowingKind !== "core")) {
    res.status(403).json({ error: "Křovák může zobrazit pouze vlastní kmenové záznamy" }); return;
  }

  res.json(await buildMowingRecord(record));
});

router.patch("/mowing-records/:id", requireMowingAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole === "manager") {
    const creatorRole = await activeUserRole(existing.userId);
    if (creatorRole !== "brushcutter" || existing.mowingKind !== "rucni" || existing.manualMowingKind !== "core") {
      res.status(403).json({ error: "Vedoucí může upravit pouze denní záznamy Křováků" }); return;
    }
  } else if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }
  if (session.userRole === "brushcutter" && (existing.mowingKind !== "rucni" || existing.manualMowingKind !== "core")) {
    res.status(403).json({ error: "Křovák může upravit pouze vlastní kmenové záznamy" }); return;
  }

  const {
    date, regionId, workType, mowingSection, mowingKind, manualMowingKind, contractorCompanyId, location, startTime, endTime,
    weatherTypeId, weatherTypeIds, temperature, vehicleId, vehicleEntries,
    mthStart, mthEnd, mthTotal, fuelConsumption, refueling,
    manualWorkerIds, machineWorkerIds, workerIds, machineIds, accessoryIds,
    workerTimeEntries, machineMthEntries,
    assignedAverage, dayHours, nightHours, laborHours,
    vehicleKmStart, vehicleKmEnd, vehicleKmTotal, vehicleRefueling, brushcutterRefueling,
    trafficMarking, note,
  } = req.body as {
    date?: string | null;
    regionId?: number | null;
    workType?: string | null;
    mowingSection?: string | null;
    mowingKind?: string | null;
    manualMowingKind?: string | null;
    contractorCompanyId?: number | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    weatherTypeIds?: number[] | null;
    temperature?: number | null;
    vehicleId?: number | null;
    vehicleEntries?: VehicleEntryPayload[] | null;
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    manualWorkerIds?: number[] | null;
    machineWorkerIds?: number[] | null;
    workerIds?: number[] | null;
    machineIds?: number[] | null;
    accessoryIds?: number[] | null;
    workerTimeEntries?: WorkerTimeEntryPayload[] | null;
    machineMthEntries?: MachineMthEntryPayload[] | null;
    assignedAverage?: string | null;
    dayHours?: number | null;
    nightHours?: number | null;
    laborHours?: number | null;
    vehicleKmStart?: number | null;
    vehicleKmEnd?: number | null;
    vehicleKmTotal?: number | null;
    vehicleRefueling?: number | null;
    brushcutterRefueling?: number | null;
    trafficMarking?: string | null;
    note?: string | null;
  };

  const existingWorkerIds = (await db.select().from(mowingRecordWorkersTable).where(eq(mowingRecordWorkersTable.mowingRecordId, id))).map((item) => item.workerId);
  const existingManualWorkerIds = parseIdList(existing.manualWorkerIds);
  const existingMachineWorkerIds = parseIdList(existing.machineWorkerIds);
  const normalizedWorkerTimeEntries = workerTimeEntries !== undefined
    ? normalizeWorkerTimeEntries(workerTimeEntries ?? [])
    : normalizeWorkerTimeEntries(existing.workerTimeEntries).length
      ? normalizeWorkerTimeEntries(existing.workerTimeEntries)
      : getFallbackWorkerTimeEntries(existing, existingWorkerIds, existingManualWorkerIds, existingMachineWorkerIds);
  const nextManualWorkerIds = workerTimeEntries !== undefined
    ? normalizedWorkerTimeEntries.filter((entry) => entry.category === "manual").map((entry) => entry.workerId)
    : manualWorkerIds !== undefined ? (manualWorkerIds ?? []) : existingManualWorkerIds;
  const nextMachineWorkerIds = workerTimeEntries !== undefined
    ? normalizedWorkerTimeEntries.filter((entry) => entry.category === "machine").map((entry) => entry.workerId)
    : machineWorkerIds !== undefined ? (machineWorkerIds ?? []) : existingMachineWorkerIds;
  const mergedWorkerIds = workerIds !== undefined || manualWorkerIds !== undefined || machineWorkerIds !== undefined || workerTimeEntries !== undefined
    ? uniqueIds(workerIds ?? [], nextManualWorkerIds, nextMachineWorkerIds)
    : existingWorkerIds;

  const nextWeatherTypeIds = weatherTypeIds !== undefined
    ? uniqueIds(weatherTypeIds ?? [], weatherTypeId != null ? [weatherTypeId] : [])
      : weatherTypeId !== undefined
      ? uniqueIds(weatherTypeId != null ? [weatherTypeId] : [])
      : parseIdList(existing.weatherTypeIds);
  const existingMachineIds = (await db.select().from(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, id))).map((item) => item.machineId);
  const normalizedMachineMthEntries = machineMthEntries !== undefined
    ? normalizeMachineMthEntries(machineMthEntries ?? [])
    : normalizeMachineMthEntries(existing.machineMthEntries).length
      ? normalizeMachineMthEntries(existing.machineMthEntries)
      : getFallbackMachineMthEntries(existing, existingMachineIds);
  const nextMachineIds = machineMthEntries !== undefined
    ? normalizedMachineMthEntries.map((entry) => entry.machineId)
    : machineIds !== undefined ? (machineIds ?? []) : existingMachineIds;
  const entryOperatorIds = normalizedMachineMthEntries.flatMap((entry) => entry.operatorId != null ? [entry.operatorId] : []);
  const entryAccessoryIds = normalizedMachineMthEntries.flatMap((entry) => entry.accessoryId != null ? [entry.accessoryId] : []);
  const resolvedMachineWorkerIds = uniqueIds(nextMachineWorkerIds, entryOperatorIds);
  const existingAccessoryIds = (await db.select().from(mowingRecordAccessoriesTable).where(eq(mowingRecordAccessoriesTable.mowingRecordId, id))).map((item) => item.accessoryId);
  const nextAccessoryIds = machineMthEntries !== undefined
    ? uniqueIds(accessoryIds ?? [], entryAccessoryIds)
    : accessoryIds !== undefined ? (accessoryIds ?? []) : existingAccessoryIds;
  const resolvedWorkerIds = uniqueIds(mergedWorkerIds, resolvedMachineWorkerIds);
  const nextMthStart = mthStart !== undefined ? mthStart : parseDbNumber(existing.mthStart);
  const nextMthEnd = mthEnd !== undefined ? mthEnd : parseDbNumber(existing.mthEnd);
  const singleMachineEntry = normalizedMachineMthEntries.length === 1 ? normalizedMachineMthEntries[0] : null;
  const aggregateMthTotal = sumMachineMthTotals(normalizedMachineMthEntries) ?? calculateDerivedTotal(nextMthStart, nextMthEnd) ?? parseDbNumber(existing.mthTotal);
  const aggregateFuelConsumption = sumMachineValue(normalizedMachineMthEntries, "fuelConsumption") ?? (fuelConsumption !== undefined ? fuelConsumption : parseDbNumber(existing.fuelConsumption));
  const aggregateRefueling = sumMachineValue(normalizedMachineMthEntries, "refueling") ?? (refueling !== undefined ? refueling : parseDbNumber(existing.refueling));
  const existingVehicleEntries = normalizeVehicleEntries(existing.vehicleEntries);
  const normalizedVehicleEntries = vehicleEntries !== undefined
    ? normalizeVehicleEntries(vehicleEntries ?? [])
    : existingVehicleEntries.length > 0
      ? existingVehicleEntries
      : existing.vehicleId
        ? [{
            vehicleId: existing.vehicleId,
            kmStart: parseDbNumber(existing.vehicleKmStart),
            kmEnd: parseDbNumber(existing.vehicleKmEnd),
            kmTotal: parseDbNumber(existing.vehicleKmTotal),
            refueling: parseDbNumber(existing.vehicleRefueling),
          }]
        : [];
  const singleVehicleEntry = normalizedVehicleEntries.length === 1 ? normalizedVehicleEntries[0] : null;
  const aggregateVehicleKm = normalizedVehicleEntries.length ? Math.round(normalizedVehicleEntries.reduce((sum, entry) => sum + (entry.kmTotal ?? 0), 0) * 100) / 100 : null;
  const aggregateVehicleRefueling = normalizedVehicleEntries.length ? Math.round(normalizedVehicleEntries.reduce((sum, entry) => sum + (entry.refueling ?? 0), 0) * 100) / 100 : null;
  const nextMowingKind = mowingKind !== undefined ? mowingKind : existing.mowingKind;
  const nextManualMowingKind = manualMowingKind !== undefined ? manualMowingKind : existing.manualMowingKind;
  const nextContractorCompanyId = contractorCompanyId !== undefined ? contractorCompanyId : existing.contractorCompanyId;

  if (["brushcutter", "manager"].includes(session.userRole) && (nextMowingKind !== "rucni" || nextManualMowingKind !== "core")) {
    res.status(403).json({ error: "Typ kmenového záznamu nelze změnit" });
    return;
  }

  if (nextMowingKind === "strojni") {
    if (normalizedMachineMthEntries.length === 0) {
      res.status(400).json({ error: "Pro strojní sečení přidejte alespoň jeden traktor" });
      return;
    }
    if (new Set(nextMachineIds).size !== nextMachineIds.length) {
      res.status(400).json({ error: "Každý traktor lze do denního záznamu přidat pouze jednou" });
      return;
    }
    if (normalizedMachineMthEntries.some((entry) => entry.operatorId == null)) {
      res.status(400).json({ error: "U každého traktoru vyberte obsluhu" });
      return;
    }
    if (normalizedMachineMthEntries.some((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthEnd < entry.mthStart)) {
      res.status(400).json({ error: "U každého traktoru vyplňte platné počáteční a konečné motohodiny" });
      return;
    }
    if ((aggregateFuelConsumption ?? 0) < 0 || (aggregateRefueling ?? 0) < 0) {
      res.status(400).json({ error: "Spotřeba ani tankování nesmí být záporné" });
      return;
    }
  }
  if (nextMowingKind === "rucni") {
    const brushcutterCore = session.userRole === "brushcutter" && nextManualMowingKind === "core";
    const managerCore = session.userRole === "manager" && nextManualMowingKind === "core";
    if (session.userRole !== "admin" && !brushcutterCore && !managerCore) { res.status(403).json({ error: "Tento typ ručního sečení nemáte oprávnění evidovat" }); return; }
    if (brushcutterCore || managerCore) {
      const ownerUserId = brushcutterCore ? session.userId : existing.userId;
      const workerId = await linkedWorkerId(ownerUserId);
      if (!workerId) { res.status(409).json({ error: "Účet Křováka není propojený s pracovním profilem" }); return; }
      if (nextManualWorkerIds.length !== 1 || nextManualWorkerIds[0] !== workerId || resolvedWorkerIds.some((id) => id !== workerId) || resolvedMachineWorkerIds.length > 0) {
        res.status(403).json({ error: "Kmenový záznam musí zůstat přiřazený původnímu Křovákovi" }); return;
      }
    }
    if (nextManualMowingKind === "core" && nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho kmenového pracovníka" }); return; }
    if (nextManualMowingKind === "slope") {
      if (normalizedMachineMthEntries.length === 0) { res.status(400).json({ error: "Přidejte alespoň jednu svahovou sekačku" }); return; }
      if (normalizedMachineMthEntries.some((entry) => entry.mthStart == null || entry.mthEnd == null || entry.mthEnd < entry.mthStart)) { res.status(400).json({ error: "U každé svahové sekačky vyplňte platné motohodiny" }); return; }
      if (nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho pracovníka" }); return; }
    }
    if (nextManualMowingKind === "subcontractor") {
      if (!nextContractorCompanyId) { res.status(400).json({ error: "Vyberte subdodavatelskou firmu" }); return; }
      if (nextManualWorkerIds.length === 0) { res.status(400).json({ error: "Vyberte alespoň jednoho pracovníka subdodavatele" }); return; }
      const [company] = await db.select().from(contractorCompaniesTable).where(and(eq(contractorCompaniesTable.id, nextContractorCompanyId), eq(contractorCompaniesTable.isActive, true), isNull(contractorCompaniesTable.deletedAt)));
      if (!company) { res.status(400).json({ error: "Vybraná subdodavatelská firma není aktivní" }); return; }
      const selectedWorkers = await db.select({ id: workersTable.id, contractorCompanyId: workersTable.contractorCompanyId }).from(workersTable).where(inArray(workersTable.id, nextManualWorkerIds));
      if (selectedWorkers.length !== nextManualWorkerIds.length || selectedWorkers.some((worker) => worker.contractorCompanyId !== nextContractorCompanyId)) { res.status(400).json({ error: "Všichni pracovníci musí patřit k vybrané firmě" }); return; }
    }
    if (!nextManualMowingKind || !["core", "slope", "subcontractor"].includes(nextManualMowingKind)) { res.status(400).json({ error: "Vyberte variantu ručního sečení" }); return; }
    const nextBrushcutterRefueling = brushcutterRefueling !== undefined ? brushcutterRefueling : parseDbNumber(existing.brushcutterRefueling);
    if ((nextBrushcutterRefueling ?? 0) < 0) { res.status(400).json({ error: "Tankování křovinořezů nesmí být záporné" }); return; }
  }
  if (normalizedVehicleEntries.some((entry) => (entry.kmStart ?? 0) < 0 || (entry.kmEnd ?? 0) < 0 || (entry.refueling ?? 0) < 0 || (entry.kmStart != null && entry.kmEnd != null && entry.kmEnd < entry.kmStart))) {
    res.status(400).json({ error: "U každé jízdy auta zadejte platné kilometry a tankování" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (date != null) updates.date = date;
  if (regionId != null) updates.regionId = regionId;
  if (workType !== undefined) updates.workType = workType;
  if (mowingSection !== undefined) updates.mowingSection = mowingSection;
  if (mowingKind !== undefined) updates.mowingKind = mowingKind;
  if (manualMowingKind !== undefined) updates.manualMowingKind = manualMowingKind;
  if (contractorCompanyId !== undefined || manualMowingKind !== undefined) updates.contractorCompanyId = nextManualMowingKind === "subcontractor" ? nextContractorCompanyId : null;
  if (location !== undefined) updates.location = location;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (weatherTypeIds !== undefined || weatherTypeId !== undefined) {
    updates.weatherTypeId = nextWeatherTypeIds[0] ?? null;
    updates.weatherTypeIds = serializeIdList(nextWeatherTypeIds);
  }
  if (temperature !== undefined) updates.temperature = temperature;
  if (vehicleEntries !== undefined) {
    updates.vehicleId = singleVehicleEntry?.vehicleId ?? null;
    updates.vehicleEntries = serializeJsonArray(normalizedVehicleEntries);
    updates.vehicleKmStart = singleVehicleEntry?.kmStart != null ? String(singleVehicleEntry.kmStart) : null;
    updates.vehicleKmEnd = singleVehicleEntry?.kmEnd != null ? String(singleVehicleEntry.kmEnd) : null;
    updates.vehicleKmTotal = aggregateVehicleKm != null ? String(aggregateVehicleKm) : null;
    updates.vehicleRefueling = aggregateVehicleRefueling != null ? String(aggregateVehicleRefueling) : null;
  } else if (vehicleId !== undefined) updates.vehicleId = vehicleId;
  if (mthStart !== undefined || machineMthEntries !== undefined) {
    updates.mthStart = singleMachineEntry?.mthStart != null ? String(singleMachineEntry.mthStart) : mthStart != null ? String(mthStart) : null;
  }
  if (mthEnd !== undefined || machineMthEntries !== undefined) {
    updates.mthEnd = singleMachineEntry?.mthEnd != null ? String(singleMachineEntry.mthEnd) : mthEnd != null ? String(mthEnd) : null;
  }
  if (mthStart !== undefined || mthEnd !== undefined || mthTotal !== undefined || machineMthEntries !== undefined) {
    updates.mthTotal = aggregateMthTotal != null ? String(aggregateMthTotal) : null;
  }
  if (fuelConsumption !== undefined || machineMthEntries !== undefined) updates.fuelConsumption = aggregateFuelConsumption != null ? String(aggregateFuelConsumption) : null;
  if (refueling !== undefined || machineMthEntries !== undefined) updates.refueling = aggregateRefueling != null ? String(aggregateRefueling) : null;
  if (manualWorkerIds !== undefined) updates.manualWorkerIds = serializeIdList(manualWorkerIds);
  if (machineWorkerIds !== undefined) updates.machineWorkerIds = serializeIdList(machineWorkerIds);
  if (workerTimeEntries !== undefined) {
    updates.manualWorkerIds = serializeIdList(nextManualWorkerIds);
    updates.machineWorkerIds = serializeIdList(resolvedMachineWorkerIds);
    updates.workerTimeEntries = serializeJsonArray(normalizedWorkerTimeEntries);
  }
  if (machineMthEntries !== undefined) {
    updates.machineWorkerIds = serializeIdList(resolvedMachineWorkerIds);
    updates.machineMthEntries = serializeJsonArray(normalizedMachineMthEntries);
  }
  if (assignedAverage !== undefined) updates.assignedAverage = assignedAverage;
  if (dayHours !== undefined) updates.dayHours = dayHours != null ? String(dayHours) : null;
  if (nightHours !== undefined) updates.nightHours = nightHours != null ? String(nightHours) : null;
  if (laborHours !== undefined) updates.laborHours = laborHours != null ? String(laborHours) : null;
  if (vehicleEntries === undefined && vehicleKmStart !== undefined) updates.vehicleKmStart = vehicleKmStart != null ? String(vehicleKmStart) : null;
  if (vehicleEntries === undefined && vehicleKmEnd !== undefined) updates.vehicleKmEnd = vehicleKmEnd != null ? String(vehicleKmEnd) : null;
  if (vehicleEntries === undefined && vehicleKmTotal !== undefined) updates.vehicleKmTotal = vehicleKmTotal != null ? String(vehicleKmTotal) : null;
  if (vehicleEntries === undefined && vehicleRefueling !== undefined) updates.vehicleRefueling = vehicleRefueling != null ? String(vehicleRefueling) : null;
  if (brushcutterRefueling !== undefined) updates.brushcutterRefueling = brushcutterRefueling != null ? String(brushcutterRefueling) : null;
  if (trafficMarking !== undefined) updates.trafficMarking = trafficMarking;
  if (note !== undefined) updates.note = note;

  const [record] = Object.keys(updates).length > 0
    ? await db.update(mowingRecordsTable).set(updates).where(eq(mowingRecordsTable.id, id)).returning()
    : [existing];

  if (workerIds !== undefined || manualWorkerIds !== undefined || machineWorkerIds !== undefined || workerTimeEntries !== undefined || machineMthEntries !== undefined) {
    await db.delete(mowingRecordWorkersTable).where(eq(mowingRecordWorkersTable.mowingRecordId, id));
    if (resolvedWorkerIds.length > 0) {
      await db.insert(mowingRecordWorkersTable).values(resolvedWorkerIds.map((workerId) => ({ mowingRecordId: id, workerId })));
    }
  }
  if (machineIds != null || machineMthEntries !== undefined) {
    await db.delete(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, id));
    if (nextMachineIds.length > 0) {
      await db.insert(mowingRecordMachinesTable).values(nextMachineIds.map((machineId) => ({ mowingRecordId: id, machineId })));
    }
  }
  if (accessoryIds != null || machineMthEntries !== undefined) {
    await db.delete(mowingRecordAccessoriesTable).where(eq(mowingRecordAccessoriesTable.mowingRecordId, id));
    if (nextAccessoryIds.length > 0) {
      await db.insert(mowingRecordAccessoriesTable).values(nextAccessoryIds.map((accessoryId) => ({ mowingRecordId: id, accessoryId })));
    }
  }

  const full = await buildMowingRecord(record);

  await logAudit({
    userId: session.userId,
    action: "update",
    tableName: "mowing_records",
    recordId: id,
    description: `Upraven záznam sečení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
    newData: { ...updates, workerIds: resolvedWorkerIds, machineIds: nextMachineIds, accessoryIds: nextAccessoryIds, weatherTypeIds: nextWeatherTypeIds, workerTimeEntries: normalizedWorkerTimeEntries, machineMthEntries: normalizedMachineMthEntries, vehicleEntries: normalizedVehicleEntries },
  });

  res.json(full);
});

router.delete("/mowing-records/:id", requireMowingAccess, async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }
  if (session.userRole === "brushcutter" && (existing.mowingKind !== "rucni" || existing.manualMowingKind !== "core")) {
    res.status(403).json({ error: "Křovák může smazat pouze vlastní kmenové záznamy" }); return;
  }

  await db.update(mowingRecordsTable).set({ deletedAt: new Date(), deletedBy: session.userId }).where(eq(mowingRecordsTable.id, id));

  await logAudit({
    userId: session.userId,
    action: "delete",
    tableName: "mowing_records",
    recordId: id,
    description: `Smazán záznam sečení ${existing.date}${existing.location ? ` – ${existing.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
  });

  res.json({ message: "Záznam smazán" });
});

export default router;
