import { Router } from "express";
import { logAudit } from "../lib/auditLog";
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
} from "@workspace/db";
import { eq, isNull, and, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { queryString } from "../lib/query";

const router = Router();

async function buildMowingRecord(record: typeof mowingRecordsTable.$inferSelect) {
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

  let vehicle = null;
  if (record.vehicleId) {
    const [v] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, record.vehicleId));
    vehicle = v ?? null;
  }

  const workerLinks = await db.select().from(mowingRecordWorkersTable).where(eq(mowingRecordWorkersTable.mowingRecordId, record.id));
  const workerIds = workerLinks.map((w) => w.workerId);
  const workers = workerIds.length > 0 ? await db.select().from(workersTable).where(inArray(workersTable.id, workerIds)) : [];

  const machineLinks = await db.select().from(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, record.id));
  const machineIds = machineLinks.map((m) => m.machineId);
  const machines = machineIds.length > 0 ? await db.select().from(machinesTable).where(inArray(machinesTable.id, machineIds)) : [];

  const accessoryLinks = await db.select().from(mowingRecordAccessoriesTable).where(eq(mowingRecordAccessoriesTable.mowingRecordId, record.id));
  const accessoryIds = accessoryLinks.map((a) => a.accessoryId);
  const accessories = accessoryIds.length > 0 ? await db.select().from(accessoriesTable).where(inArray(accessoriesTable.id, accessoryIds)) : [];

  return {
    ...record,
    mthStart: record.mthStart ? parseFloat(record.mthStart) : null,
    mthEnd: record.mthEnd ? parseFloat(record.mthEnd) : null,
    mthTotal: record.mthTotal ? parseFloat(record.mthTotal) : null,
    fuelConsumption: record.fuelConsumption ? parseFloat(record.fuelConsumption) : null,
    refueling: record.refueling ? parseFloat(record.refueling) : null,
    workerIds,
    machineIds,
    accessoryIds,
    user,
    region,
    weatherType,
    vehicle,
    workers,
    machines,
    accessories,
  };
}

router.get("/mowing-records", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const filterUserId = queryString(req.query.userId);
  const dateFrom = queryString(req.query.dateFrom);
  const dateTo = queryString(req.query.dateTo);
  const regionId = queryString(req.query.regionId);

  const conditions = [isNull(mowingRecordsTable.deletedAt)];

  if (session.userRole !== "admin") {
    conditions.push(eq(mowingRecordsTable.userId, session.userId));
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

  const result = await Promise.all(records.map(buildMowingRecord));
  res.json(result);
});

router.post("/mowing-records", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const {
    date, regionId, location, startTime, endTime,
    weatherTypeId, vehicleId,
    mthStart, mthEnd, mthTotal, fuelConsumption, refueling,
    workerIds, machineIds, accessoryIds, note,
  } = req.body as {
    date?: string;
    regionId?: number;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    vehicleId?: number | null;
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    workerIds?: number[];
    machineIds?: number[];
    accessoryIds?: number[];
    note?: string | null;
  };

  if (!date || !regionId) {
    res.status(400).json({ error: "Datum a revír jsou povinné" });
    return;
  }

  const [record] = await db.insert(mowingRecordsTable).values({
    date,
    userId: session.userId,
    regionId,
    location: location ?? null,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    weatherTypeId: weatherTypeId ?? null,
    vehicleId: vehicleId ?? null,
    mthStart: mthStart != null ? String(mthStart) : null,
    mthEnd: mthEnd != null ? String(mthEnd) : null,
    mthTotal: mthTotal != null ? String(mthTotal) : null,
    fuelConsumption: fuelConsumption != null ? String(fuelConsumption) : null,
    refueling: refueling != null ? String(refueling) : null,
    note: note ?? null,
  }).returning();

  if (workerIds && workerIds.length > 0) {
    await db.insert(mowingRecordWorkersTable).values(workerIds.map((wId) => ({ mowingRecordId: record.id, workerId: wId })));
  }
  if (machineIds && machineIds.length > 0) {
    await db.insert(mowingRecordMachinesTable).values(machineIds.map((mId) => ({ mowingRecordId: record.id, machineId: mId })));
  }
  if (accessoryIds && accessoryIds.length > 0) {
    await db.insert(mowingRecordAccessoriesTable).values(accessoryIds.map((aId) => ({ mowingRecordId: record.id, accessoryId: aId })));
  }

  const full = await buildMowingRecord(record);

  await logAudit({
    userId: session.userId, action: "create", tableName: "mowing_records", recordId: record.id,
    description: `Vytvořen záznam sečení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    newData: { date: record.date, regionId: record.regionId, location: record.location, workerIds, machineIds },
  });

  res.status(201).json(full);
});

router.get("/mowing-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [record] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!record) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && record.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  const full = await buildMowingRecord(record);
  res.json(full);
});

router.patch("/mowing-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  const {
    date, regionId, location, startTime, endTime,
    weatherTypeId, vehicleId,
    mthStart, mthEnd, mthTotal, fuelConsumption, refueling,
    workerIds, machineIds, accessoryIds, note,
  } = req.body as {
    date?: string | null;
    regionId?: number | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    weatherTypeId?: number | null;
    vehicleId?: number | null;
    mthStart?: number | null;
    mthEnd?: number | null;
    mthTotal?: number | null;
    fuelConsumption?: number | null;
    refueling?: number | null;
    workerIds?: number[] | null;
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
  if (vehicleId !== undefined) updates.vehicleId = vehicleId;
  if (mthStart !== undefined) updates.mthStart = mthStart != null ? String(mthStart) : null;
  if (mthEnd !== undefined) updates.mthEnd = mthEnd != null ? String(mthEnd) : null;
  if (mthTotal !== undefined) updates.mthTotal = mthTotal != null ? String(mthTotal) : null;
  if (fuelConsumption !== undefined) updates.fuelConsumption = fuelConsumption != null ? String(fuelConsumption) : null;
  if (refueling !== undefined) updates.refueling = refueling != null ? String(refueling) : null;
  if (note !== undefined) updates.note = note;

  const [record] = Object.keys(updates).length > 0
    ? await db.update(mowingRecordsTable).set(updates).where(eq(mowingRecordsTable.id, id)).returning()
    : [existing];

  if (workerIds != null) {
    await db.delete(mowingRecordWorkersTable).where(eq(mowingRecordWorkersTable.mowingRecordId, id));
    if (workerIds.length > 0) {
      await db.insert(mowingRecordWorkersTable).values(workerIds.map((wId) => ({ mowingRecordId: id, workerId: wId })));
    }
  }
  if (machineIds != null) {
    await db.delete(mowingRecordMachinesTable).where(eq(mowingRecordMachinesTable.mowingRecordId, id));
    if (machineIds.length > 0) {
      await db.insert(mowingRecordMachinesTable).values(machineIds.map((mId) => ({ mowingRecordId: id, machineId: mId })));
    }
  }
  if (accessoryIds != null) {
    await db.delete(mowingRecordAccessoriesTable).where(eq(mowingRecordAccessoriesTable.mowingRecordId, id));
    if (accessoryIds.length > 0) {
      await db.insert(mowingRecordAccessoriesTable).values(accessoryIds.map((aId) => ({ mowingRecordId: id, accessoryId: aId })));
    }
  }

  const full = await buildMowingRecord(record);

  await logAudit({
    userId: session.userId, action: "update", tableName: "mowing_records", recordId: id,
    description: `Upraven záznam sečení ${record.date}${record.location ? ` – ${record.location}` : ""}`,
    oldData: existing as Record<string, unknown>, newData: { ...updates, workerIds, machineIds, accessoryIds },
  });

  res.json(full);
});

router.delete("/mowing-records/:id", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [existing] = await db.select().from(mowingRecordsTable).where(and(eq(mowingRecordsTable.id, id), isNull(mowingRecordsTable.deletedAt)));
  if (!existing) { res.status(404).json({ error: "Záznam nenalezen" }); return; }

  if (session.userRole !== "admin" && existing.userId !== session.userId) {
    res.status(403).json({ error: "Nedostatečná oprávnění" }); return;
  }

  await db.update(mowingRecordsTable).set({ deletedAt: new Date(), deletedBy: session.userId }).where(eq(mowingRecordsTable.id, id));

  await logAudit({
    userId: session.userId, action: "delete", tableName: "mowing_records", recordId: id,
    description: `Smazán záznam sečení ${existing.date}${existing.location ? ` – ${existing.location}` : ""}`,
    oldData: existing as Record<string, unknown>,
  });

  res.json({ message: "Záznam smazán" });
});

export default router;
