import { Router } from "express";
import { logAudit } from "../lib/auditLog";
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
import { eq, isNull, and, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { queryString } from "../lib/query";

const router = Router();

async function buildFellingRecord(record: typeof fellingRecordsTable.$inferSelect) {
  const [user] = await db
    .select({ id: usersTable.id, username: usersTable.username, fullName: usersTable.fullName, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt, updatedAt: usersTable.updatedAt })
    .from(usersTable)
    .where(eq(usersTable.id, record.userId));

  const [region] = await db.select().from(regionsTable).where(eq(regionsTable.id, record.regionId));

  let weatherType = null;
  if (record.weatherTypeId) {
    const [wt] = await db.select().from(weatherTypesTable).where(eq(weatherTypesTable.id, record.weatherTypeId));
    weatherType = wt ?? null;
  }

  const workerLinks = await db.select().from(fellingRecordWorkersTable).where(eq(fellingRecordWorkersTable.fellingRecordId, record.id));
  const workerIds = workerLinks.map((w) => w.workerId);
  const workers = workerIds.length > 0 ? await db.select().from(workersTable).where(inArray(workersTable.id, workerIds)) : [];

  const vehicleLinks = await db.select().from(fellingRecordVehiclesTable).where(eq(fellingRecordVehiclesTable.fellingRecordId, record.id));
  const vehicleIds = vehicleLinks.map((v) => v.vehicleId);
  const vehicles = vehicleIds.length > 0 ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.id, vehicleIds)) : [];

  const machineLinks = await db.select().from(fellingRecordMachinesTable).where(eq(fellingRecordMachinesTable.fellingRecordId, record.id));
  const machineIds = machineLinks.map((m) => m.machineId);
  const machines = machineIds.length > 0 ? await db.select().from(machinesTable).where(inArray(machinesTable.id, machineIds)) : [];

  const accessoryLinks = await db.select().from(fellingRecordAccessoriesTable).where(eq(fellingRecordAccessoriesTable.fellingRecordId, record.id));
  const accessoryIds = accessoryLinks.map((a) => a.accessoryId);
  const accessories = accessoryIds.length > 0 ? await db.select().from(accessoriesTable).where(inArray(accessoriesTable.id, accessoryIds)) : [];

  return {
    ...record,
    mth: record.mth ? parseFloat(record.mth) : null,
    fuelConsumption: record.fuelConsumption ? parseFloat(record.fuelConsumption) : null,
    refueling: record.refueling ? parseFloat(record.refueling) : null,
    workerIds,
    vehicleIds,
    machineIds,
    accessoryIds,
    user,
    region,
    weatherType,
    workers,
    vehicles,
    machines,
    accessories,
  };
}

router.get("/felling-records", requireAuth, async (req, res): Promise<void> => {
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

  const result = await Promise.all(records.map(buildFellingRecord));
  res.json(result);
});

router.post("/felling-records", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const {
    date, regionId, location, startTime, endTime,
    weatherTypeId, temperature, mth, fuelConsumption, refueling,
    workerIds, vehicleIds, machineIds, accessoryIds, note,
  } = req.body as {
    date?: string;
    regionId?: number;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    temperature?: number | null;
    mth?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    workerIds?: number[];
    vehicleIds?: number[];
    machineIds?: number[];
    accessoryIds?: number[];
    note?: string | null;
  };

  if (!date || !regionId) {
    res.status(400).json({ error: "Datum a revír jsou povinné" });
    return;
  }

  const [record] = await db.insert(fellingRecordsTable).values({
    date,
    userId: session.userId,
    regionId,
    location: location ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    weatherTypeId: weatherTypeId ?? null,
    temperature: temperature ?? null,
    mth: mth != null ? String(mth) : null,
    fuelConsumption: fuelConsumption != null ? String(fuelConsumption) : null,
    refueling: refueling != null ? String(refueling) : null,
    note: note ?? null,
  }).returning();

  if (workerIds && workerIds.length > 0) {
    await db.insert(fellingRecordWorkersTable).values(workerIds.map((wId) => ({ fellingRecordId: record.id, workerId: wId })));
  }
  if (vehicleIds && vehicleIds.length > 0) {
    await db.insert(fellingRecordVehiclesTable).values(vehicleIds.map((vId) => ({ fellingRecordId: record.id, vehicleId: vId })));
  }
  if (machineIds && machineIds.length > 0) {
    await db.insert(fellingRecordMachinesTable).values(machineIds.map((mId) => ({ fellingRecordId: record.id, machineId: mId })));
  }
  if (accessoryIds && accessoryIds.length > 0) {
    await db.insert(fellingRecordAccessoriesTable).values(accessoryIds.map((aId) => ({ fellingRecordId: record.id, accessoryId: aId })));
  }

  const full = await buildFellingRecord(record);

  await logAudit({
    userId: session.userId, action: "create", tableName: "felling_records", recordId: record.id,
    description: `Vytvořen záznam kácení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    newData: { date: record.date, regionId: record.regionId, location: record.location, workerIds, vehicleIds, machineIds },
  });

  res.status(201).json(full);
});

router.get("/felling-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [record] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!record) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && record.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" });
    return;
  }

  const full = await buildFellingRecord(record);
  res.json(full);
});

router.patch("/felling-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  const {
    date, regionId, location, startTime, endTime,
    weatherTypeId, temperature, mth, fuelConsumption, refueling,
    workerIds, vehicleIds, machineIds, accessoryIds, note,
  } = req.body as {
    date?: string | null;
    regionId?: number | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    temperature?: number | null;
    mth?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    workerIds?: number[] | null;
    vehicleIds?: number[] | null;
    machineIds?: number[] | null;
    accessoryIds?: number[] | null;
    note?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (date != null) updates.date = date;
  if (regionId != null) updates.regionId = regionId;
  if (location !== undefined) updates.location = location;
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (weatherTypeId !== undefined) updates.weatherTypeId = weatherTypeId;
  if (temperature !== undefined) updates.temperature = temperature;
  if (mth !== undefined) updates.mth = mth != null ? String(mth) : null;
  if (fuelConsumption !== undefined) updates.fuelConsumption = fuelConsumption != null ? String(fuelConsumption) : null;
  if (refueling !== undefined) updates.refueling = refueling != null ? String(refueling) : null;
  if (note !== undefined) updates.note = note;

  const [record] = Object.keys(updates).length > 0
    ? await db.update(fellingRecordsTable).set(updates).where(eq(fellingRecordsTable.id, id)).returning()
    : [existing];

  if (workerIds != null) {
    await db.delete(fellingRecordWorkersTable).where(eq(fellingRecordWorkersTable.fellingRecordId, id));
    if (workerIds.length > 0) {
      await db.insert(fellingRecordWorkersTable).values(workerIds.map((wId) => ({ fellingRecordId: id, workerId: wId })));
    }
  }
  if (vehicleIds != null) {
    await db.delete(fellingRecordVehiclesTable).where(eq(fellingRecordVehiclesTable.fellingRecordId, id));
    if (vehicleIds.length > 0) {
      await db.insert(fellingRecordVehiclesTable).values(vehicleIds.map((vId) => ({ fellingRecordId: id, vehicleId: vId })));
    }
  }
  if (machineIds != null) {
    await db.delete(fellingRecordMachinesTable).where(eq(fellingRecordMachinesTable.fellingRecordId, id));
    if (machineIds.length > 0) {
      await db.insert(fellingRecordMachinesTable).values(machineIds.map((mId) => ({ fellingRecordId: id, machineId: mId })));
    }
  }
  if (accessoryIds != null) {
    await db.delete(fellingRecordAccessoriesTable).where(eq(fellingRecordAccessoriesTable.fellingRecordId, id));
    if (accessoryIds.length > 0) {
      await db.insert(fellingRecordAccessoriesTable).values(accessoryIds.map((aId) => ({ fellingRecordId: id, accessoryId: aId })));
    }
  }

  const full = await buildFellingRecord(record);

  await logAudit({
    userId: session.userId, action: "update", tableName: "felling_records", recordId: id,
    description: `Upraven záznam kácení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    oldData: existing as Record<string, unknown>, newData: { ...updates, workerIds, vehicleIds, machineIds },
  });

  res.json(full);
});

router.delete("/felling-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(fellingRecordsTable).where(and(eq(fellingRecordsTable.id, id), isNull(fellingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  await db.update(fellingRecordsTable).set({ deletedAt: new Date(), deletedBy: session.userId }).where(eq(fellingRecordsTable.id, id));

  await logAudit({
    userId: session.userId, action: "delete", tableName: "felling_records", recordId: id,
    description: `Smazán záznam kácení ${existing.date}${existing.location ? ` – ${existing.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
  });

  res.json({ message: "Záznam smazán" });
});

export default router;
