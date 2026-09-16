import { Router } from "express";
import { eq, isNull, and, gte, lte, inArray } from "drizzle-orm";
import { requireOperationsAccess } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";
import { queryString } from "../lib/query";
import {
  calculateDerivedTotal,
  normalizeMachineMthEntries,
  normalizeWorkerTimeEntries,
  parseDbNumber,
  parseIdList,
  serializeIdList,
  serializeJsonArray,
  sumMachineMthTotals,
  sumMachineValue,
  uniqueIds,
  type MachineMthEntryPayload,
  type WorkerTimeEntryPayload,
} from "../lib/recordFields";
import {
  db,
  fellingRecordsTable,
  fellingRecordWorkersTable,
  fellingRecordVehiclesTable,
  fellingRecordMachinesTable,
  fellingRecordAccessoriesTable,
  usersTable,
  regionsTable,
  weatherTypesTable,
  vehiclesTable,
  workersTable,
  machinesTable,
  accessoriesTable,
} from "@workspace/db";

const router = Router();

function getFallbackWorkerTimeEntries(record: typeof fellingRecordsTable.$inferSelect, workerIds: number[], manualWorkerIds: number[], machineWorkerIds: number[]) {
  return workerIds.map((workerId) => ({
    workerId,
    category: machineWorkerIds.includes(workerId) ? "machine" : "manual",
    startTime: record.startTime ?? null,
    endTime: record.endTime ?? null,
  })) satisfies WorkerTimeEntryPayload[];
}

function getFallbackMachineMthEntries(record: typeof fellingRecordsTable.$inferSelect, machineIds: number[]) {
  return machineIds.map((machineId) => ({
    machineId,
    startTime: record.startTime ?? null,
    endTime: record.endTime ?? null,
    mthStart: null,
    mthEnd: null,
    mthTotal: machineIds.length === 1 ? parseDbNumber(record.mth) : null,
    fuelConsumption: machineIds.length === 1 ? parseDbNumber(record.fuelConsumption) : null,
    refueling: machineIds.length === 1 ? parseDbNumber(record.refueling) : null,
  })) satisfies MachineMthEntryPayload[];
}

async function buildFellingRecord(record: typeof fellingRecordsTable.$inferSelect) {
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

  const workerLinks = await db.select().from(fellingRecordWorkersTable).where(eq(fellingRecordWorkersTable.fellingRecordId, record.id));
  const workerIds = workerLinks.map((w) => w.workerId);
  const workers = workerIds.length > 0 ? await db.select().from(workersTable).where(inArray(workersTable.id, workerIds)) : [];

  const manualWorkerIds = parseIdList(record.manualWorkerIds).length ? parseIdList(record.manualWorkerIds) : workerIds;
  const machineWorkerIds = parseIdList(record.machineWorkerIds);
  const manualWorkers = manualWorkerIds.length > 0 ? workers.filter((worker) => manualWorkerIds.includes(worker.id)) : [];
  const machineWorkers = machineWorkerIds.length > 0 ? workers.filter((worker) => machineWorkerIds.includes(worker.id)) : [];

  const vehicleLinks = await db.select().from(fellingRecordVehiclesTable).where(eq(fellingRecordVehiclesTable.fellingRecordId, record.id));
  const vehicleIds = vehicleLinks.map((v) => v.vehicleId);
  const vehicles = vehicleIds.length > 0 ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.id, vehicleIds)) : [];

  const machineLinks = await db.select().from(fellingRecordMachinesTable).where(eq(fellingRecordMachinesTable.fellingRecordId, record.id));
  const machineIds = machineLinks.map((m) => m.machineId);
  const machines = machineIds.length > 0 ? await db.select().from(machinesTable).where(inArray(machinesTable.id, machineIds)) : [];

  const accessoryLinks = await db.select().from(fellingRecordAccessoriesTable).where(eq(fellingRecordAccessoriesTable.fellingRecordId, record.id));
  const accessoryIds = accessoryLinks.map((a) => a.accessoryId);
  const accessories = accessoryIds.length > 0 ? await db.select().from(accessoriesTable).where(inArray(accessoriesTable.id, accessoryIds)) : [];

  const workerTimeEntries = normalizeWorkerTimeEntries(record.workerTimeEntries)
    .filter((entry) => workerIds.includes(entry.workerId));
  const resolvedWorkerTimeEntries = workerTimeEntries.length > 0
    ? workerTimeEntries
    : getFallbackWorkerTimeEntries(record, workerIds, manualWorkerIds, machineWorkerIds);
  const machineMthEntries = normalizeMachineMthEntries(record.machineMthEntries)
    .filter((entry) => machineIds.includes(entry.machineId));
  const resolvedMachineMthEntries = machineMthEntries.length > 0
    ? machineMthEntries
    : getFallbackMachineMthEntries(record, machineIds);

  return {
    ...record,
    weatherTypeIds: resolvedWeatherTypeIds,
    weatherTypes,
    mth: sumMachineMthTotals(resolvedMachineMthEntries) ?? parseDbNumber(record.mth),
    fuelConsumption: sumMachineValue(resolvedMachineMthEntries, "fuelConsumption") ?? parseDbNumber(record.fuelConsumption),
    refueling: sumMachineValue(resolvedMachineMthEntries, "refueling") ?? parseDbNumber(record.refueling),
    vehicleKmStart: parseDbNumber(record.vehicleKmStart),
    vehicleKmEnd: parseDbNumber(record.vehicleKmEnd),
    vehicleKmTotal: parseDbNumber(record.vehicleKmTotal),
    vehicleRefueling: parseDbNumber(record.vehicleRefueling),
    manualWorkerIds,
    machineWorkerIds,
    workerIds,
    vehicleIds,
    machineIds,
    accessoryIds,
    workerTimeEntries: resolvedWorkerTimeEntries.map((entry) => ({
      ...entry,
      worker: workers.find((worker) => worker.id === entry.workerId) ?? null,
    })),
    machineMthEntries: resolvedMachineMthEntries.map((entry) => ({
      ...entry,
      machine: machines.find((machine) => machine.id === entry.machineId) ?? null,
    })),
    user,
    region,
    weatherType,
    workers,
    manualWorkers,
    machineWorkers,
    vehicles,
    machines,
    accessories,
  };
}

router.get("/felling-records", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const filterUserId = queryString(req.query.userId);
  const dateFrom = queryString(req.query.dateFrom);
  const dateTo = queryString(req.query.dateTo);
  const regionId = queryString(req.query.regionId);

  const conditions = [isNull(fellingRecordsTable.deletedAt)];

  if (session.userRole !== "admin") {
    conditions.push(eq(fellingRecordsTable.userId, session.userId));
  } else if (filterUserId) {
    conditions.push(eq(fellingRecordsTable.userId, parseInt(filterUserId, 10)));
  }

  if (dateFrom) conditions.push(gte(fellingRecordsTable.date, dateFrom));
  if (dateTo) conditions.push(lte(fellingRecordsTable.date, dateTo));
  if (regionId) conditions.push(eq(fellingRecordsTable.regionId, parseInt(regionId, 10)));

  const records = await db
    .select()
    .from(fellingRecordsTable)
    .where(and(...conditions))
    .orderBy(fellingRecordsTable.date);

  res.json(await Promise.all(records.map(buildFellingRecord)));
});

router.post("/felling-records", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const {
    date, regionId, workType, location, startTime, endTime,
    weatherTypeId, weatherTypeIds, temperature, mth, fuelConsumption, refueling,
    manualWorkerIds, machineWorkerIds, workerIds, vehicleIds, machineIds, accessoryIds,
    workerTimeEntries, machineMthEntries,
    assignedAverage, vehicleKmStart, vehicleKmEnd, vehicleKmTotal, vehicleRefueling, trafficMarking, note,
  } = req.body as {
    date?: string;
    regionId?: number;
    workType?: string | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    weatherTypeIds?: number[] | null;
    temperature?: number | null;
    mth?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    manualWorkerIds?: number[] | null;
    machineWorkerIds?: number[] | null;
    workerIds?: number[] | null;
    vehicleIds?: number[];
    machineIds?: number[];
    accessoryIds?: number[];
    workerTimeEntries?: WorkerTimeEntryPayload[] | null;
    machineMthEntries?: MachineMthEntryPayload[] | null;
    assignedAverage?: string | null;
    vehicleKmStart?: number | null;
    vehicleKmEnd?: number | null;
    vehicleKmTotal?: number | null;
    vehicleRefueling?: number | null;
    trafficMarking?: string | null;
    note?: string | null;
  };

  if (!date || !regionId) {
    res.status(400).json({ error: "Datum a revír jsou povinné" });
    return;
  }

  const normalizedWorkerTimeEntries = normalizeWorkerTimeEntries(workerTimeEntries ?? []);
  const normalizedMachineMthEntries = normalizeMachineMthEntries(machineMthEntries ?? []);
  const derivedManualWorkerIds = normalizedWorkerTimeEntries.filter((entry) => entry.category === "manual").map((entry) => entry.workerId);
  const derivedMachineWorkerIds = normalizedWorkerTimeEntries.filter((entry) => entry.category === "machine").map((entry) => entry.workerId);
  const derivedMachineIds = normalizedMachineMthEntries.map((entry) => entry.machineId);
  const nextManualWorkerIds = workerTimeEntries !== undefined ? derivedManualWorkerIds : (manualWorkerIds ?? []);
  const nextMachineWorkerIds = workerTimeEntries !== undefined ? derivedMachineWorkerIds : (machineWorkerIds ?? []);
  const nextMachineIds = machineMthEntries !== undefined ? derivedMachineIds : (machineIds ?? []);
  const mergedWorkerIds = uniqueIds(workerIds ?? [], nextManualWorkerIds, nextMachineWorkerIds);
  const mergedWeatherTypeIds = uniqueIds(weatherTypeIds ?? [], weatherTypeId != null ? [weatherTypeId] : []);
  const totalMth = sumMachineMthTotals(normalizedMachineMthEntries) ?? mth ?? null;
  const aggregateFuelConsumption = sumMachineValue(normalizedMachineMthEntries, "fuelConsumption") ?? fuelConsumption ?? null;
  const aggregateRefueling = sumMachineValue(normalizedMachineMthEntries, "refueling") ?? refueling ?? null;

  const [record] = await db.insert(fellingRecordsTable).values({
    date,
    userId: session.userId,
    regionId,
    workType: workType ?? null,
    location: location ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    weatherTypeId: mergedWeatherTypeIds[0] ?? weatherTypeId ?? null,
    weatherTypeIds: serializeIdList(mergedWeatherTypeIds),
    temperature: temperature ?? null,
    mth: totalMth != null ? String(totalMth) : null,
    fuelConsumption: aggregateFuelConsumption != null ? String(aggregateFuelConsumption) : null,
    refueling: aggregateRefueling != null ? String(aggregateRefueling) : null,
    manualWorkerIds: serializeIdList(nextManualWorkerIds),
    machineWorkerIds: serializeIdList(nextMachineWorkerIds),
    workerTimeEntries: serializeJsonArray(normalizedWorkerTimeEntries),
    machineMthEntries: serializeJsonArray(normalizedMachineMthEntries),
    assignedAverage: assignedAverage ?? null,
    vehicleKmStart: vehicleKmStart != null ? String(vehicleKmStart) : null,
    vehicleKmEnd: vehicleKmEnd != null ? String(vehicleKmEnd) : null,
    vehicleKmTotal: vehicleKmTotal != null ? String(vehicleKmTotal) : null,
    vehicleRefueling: vehicleRefueling != null ? String(vehicleRefueling) : null,
    trafficMarking: trafficMarking ?? null,
    note: note ?? null,
  }).returning();

  if (mergedWorkerIds.length > 0) {
    await db.insert(fellingRecordWorkersTable).values(mergedWorkerIds.map((workerId) => ({ fellingRecordId: record.id, workerId })));
  }
  if (vehicleIds && vehicleIds.length > 0) {
    await db.insert(fellingRecordVehiclesTable).values(vehicleIds.map((vehicleId) => ({ fellingRecordId: record.id, vehicleId })));
  }
  if (nextMachineIds.length > 0) {
    await db.insert(fellingRecordMachinesTable).values(nextMachineIds.map((machineId) => ({ fellingRecordId: record.id, machineId })));
  }
  if (accessoryIds && accessoryIds.length > 0) {
    await db.insert(fellingRecordAccessoriesTable).values(accessoryIds.map((accessoryId) => ({ fellingRecordId: record.id, accessoryId })));
  }

  const full = await buildFellingRecord(record);

  await logAudit({
    userId: session.userId,
    action: "create",
    tableName: "felling_records",
    recordId: record.id,
    description: `Vytvořen záznam kácení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    newData: { date: record.date, regionId: record.regionId, workType: record.workType, workerIds: mergedWorkerIds, vehicleIds, machineIds: nextMachineIds, weatherTypeIds: mergedWeatherTypeIds, workerTimeEntries: normalizedWorkerTimeEntries, machineMthEntries: normalizedMachineMthEntries },
  });

  res.status(201).json(full);
});

router.get("/felling-records/:id", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [record] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!record) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && record.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" });
    return;
  }

  res.json(await buildFellingRecord(record));
});

router.patch("/felling-records/:id", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  const {
    date, regionId, workType, location, startTime, endTime,
    weatherTypeId, weatherTypeIds, temperature, mth, fuelConsumption, refueling,
    manualWorkerIds, machineWorkerIds, workerIds, vehicleIds, machineIds, accessoryIds,
    workerTimeEntries, machineMthEntries,
    assignedAverage, vehicleKmStart, vehicleKmEnd, vehicleKmTotal, vehicleRefueling, trafficMarking, note,
  } = req.body as {
    date?: string | null;
    regionId?: number | null;
    workType?: string | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    weatherTypeIds?: number[] | null;
    temperature?: number | null;
    mth?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    manualWorkerIds?: number[] | null;
    machineWorkerIds?: number[] | null;
    workerIds?: number[] | null;
    vehicleIds?: number[] | null;
    machineIds?: number[] | null;
    accessoryIds?: number[] | null;
    workerTimeEntries?: WorkerTimeEntryPayload[] | null;
    machineMthEntries?: MachineMthEntryPayload[] | null;
    assignedAverage?: string | null;
    vehicleKmStart?: number | null;
    vehicleKmEnd?: number | null;
    vehicleKmTotal?: number | null;
    vehicleRefueling?: number | null;
    trafficMarking?: string | null;
    note?: string | null;
  };

  const existingWorkerIds = (await db.select().from(fellingRecordWorkersTable).where(eq(fellingRecordWorkersTable.fellingRecordId, id))).map((item) => item.workerId);
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
  const existingMachineIds = (await db.select().from(fellingRecordMachinesTable).where(eq(fellingRecordMachinesTable.fellingRecordId, id))).map((item) => item.machineId);
  const normalizedMachineMthEntries = machineMthEntries !== undefined
    ? normalizeMachineMthEntries(machineMthEntries ?? [])
    : normalizeMachineMthEntries(existing.machineMthEntries).length
      ? normalizeMachineMthEntries(existing.machineMthEntries)
      : getFallbackMachineMthEntries(existing, existingMachineIds);
  const nextMachineIds = machineMthEntries !== undefined
    ? normalizedMachineMthEntries.map((entry) => entry.machineId)
    : machineIds !== undefined ? (machineIds ?? []) : existingMachineIds;
  const totalMth = sumMachineMthTotals(normalizedMachineMthEntries) ?? (mth !== undefined ? mth : parseDbNumber(existing.mth));
  const aggregateFuelConsumption = sumMachineValue(normalizedMachineMthEntries, "fuelConsumption") ?? (fuelConsumption !== undefined ? fuelConsumption : parseDbNumber(existing.fuelConsumption));
  const aggregateRefueling = sumMachineValue(normalizedMachineMthEntries, "refueling") ?? (refueling !== undefined ? refueling : parseDbNumber(existing.refueling));

  const updates: Record<string, unknown> = {};
  if (date != null) updates.date = date;
  if (regionId != null) updates.regionId = regionId;
  if (workType !== undefined) updates.workType = workType;
  if (location !== undefined) updates.location = location;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (weatherTypeIds !== undefined || weatherTypeId !== undefined) {
    updates.weatherTypeId = nextWeatherTypeIds[0] ?? null;
    updates.weatherTypeIds = serializeIdList(nextWeatherTypeIds);
  }
  if (temperature !== undefined) updates.temperature = temperature;
  if (mth !== undefined || machineMthEntries !== undefined) updates.mth = totalMth != null ? String(totalMth) : null;
  if (fuelConsumption !== undefined || machineMthEntries !== undefined) updates.fuelConsumption = aggregateFuelConsumption != null ? String(aggregateFuelConsumption) : null;
  if (refueling !== undefined || machineMthEntries !== undefined) updates.refueling = aggregateRefueling != null ? String(aggregateRefueling) : null;
  if (manualWorkerIds !== undefined) updates.manualWorkerIds = serializeIdList(manualWorkerIds);
  if (machineWorkerIds !== undefined) updates.machineWorkerIds = serializeIdList(machineWorkerIds);
  if (workerTimeEntries !== undefined) {
    updates.manualWorkerIds = serializeIdList(nextManualWorkerIds);
    updates.machineWorkerIds = serializeIdList(nextMachineWorkerIds);
    updates.workerTimeEntries = serializeJsonArray(normalizedWorkerTimeEntries);
  }
  if (machineMthEntries !== undefined) {
    updates.machineMthEntries = serializeJsonArray(normalizedMachineMthEntries);
  }
  if (assignedAverage !== undefined) updates.assignedAverage = assignedAverage;
  if (vehicleKmStart !== undefined) updates.vehicleKmStart = vehicleKmStart != null ? String(vehicleKmStart) : null;
  if (vehicleKmEnd !== undefined) updates.vehicleKmEnd = vehicleKmEnd != null ? String(vehicleKmEnd) : null;
  if (vehicleKmTotal !== undefined) updates.vehicleKmTotal = vehicleKmTotal != null ? String(vehicleKmTotal) : null;
  if (vehicleRefueling !== undefined) updates.vehicleRefueling = vehicleRefueling != null ? String(vehicleRefueling) : null;
  if (trafficMarking !== undefined) updates.trafficMarking = trafficMarking;
  if (note !== undefined) updates.note = note;

  const [record] = Object.keys(updates).length > 0
    ? await db.update(fellingRecordsTable).set(updates).where(eq(fellingRecordsTable.id, id)).returning()
    : [existing];

  if (workerIds !== undefined || manualWorkerIds !== undefined || machineWorkerIds !== undefined || workerTimeEntries !== undefined) {
    await db.delete(fellingRecordWorkersTable).where(eq(fellingRecordWorkersTable.fellingRecordId, id));
    if (mergedWorkerIds.length > 0) {
      await db.insert(fellingRecordWorkersTable).values(mergedWorkerIds.map((workerId) => ({ fellingRecordId: id, workerId })));
    }
  }
  if (vehicleIds != null) {
    await db.delete(fellingRecordVehiclesTable).where(eq(fellingRecordVehiclesTable.fellingRecordId, id));
    if (vehicleIds.length > 0) {
      await db.insert(fellingRecordVehiclesTable).values(vehicleIds.map((vehicleId) => ({ fellingRecordId: id, vehicleId })));
    }
  }
  if (machineIds != null || machineMthEntries !== undefined) {
    await db.delete(fellingRecordMachinesTable).where(eq(fellingRecordMachinesTable.fellingRecordId, id));
    if (nextMachineIds.length > 0) {
      await db.insert(fellingRecordMachinesTable).values(nextMachineIds.map((machineId) => ({ fellingRecordId: id, machineId })));
    }
  }
  if (accessoryIds != null) {
    await db.delete(fellingRecordAccessoriesTable).where(eq(fellingRecordAccessoriesTable.fellingRecordId, id));
    if (accessoryIds.length > 0) {
      await db.insert(fellingRecordAccessoriesTable).values(accessoryIds.map((accessoryId) => ({ fellingRecordId: id, accessoryId })));
    }
  }

  const full = await buildFellingRecord(record);

  await logAudit({
    userId: session.userId,
    action: "update",
    tableName: "felling_records",
    recordId: id,
    description: `Upraven záznam kácení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
    newData: { ...updates, workerIds: mergedWorkerIds, vehicleIds, machineIds: nextMachineIds, accessoryIds, weatherTypeIds: nextWeatherTypeIds, workerTimeEntries: normalizedWorkerTimeEntries, machineMthEntries: normalizedMachineMthEntries },
  });

  res.json(full);
});

router.delete("/felling-records/:id", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  await db.update(fellingRecordsTable).set({ deletedAt: new Date(), deletedBy: session.userId }).where(eq(fellingRecordsTable.id, id));

  await logAudit({
    userId: session.userId,
    action: "delete",
    tableName: "felling_records",
    recordId: id,
    description: `Smazán záznam kácení ${existing.date}${existing.location ? ` – ${existing.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
  });

  res.json({ message: "Záznam smazán" });
});

export default router;
