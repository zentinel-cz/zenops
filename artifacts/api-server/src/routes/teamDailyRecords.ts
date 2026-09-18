import { Router } from "express";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  accessoriesTable,
  db,
  machinesTable,
  regionsTable,
  teamDailyAssignmentsTable,
  teamDailyEntriesTable,
  teamDailyRecordsTable,
  usersTable,
  vehiclesTable,
  weatherTypesTable,
  workersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

type Role = "admin" | "user" | "employee" | "manager";
type SessionData = { userId: number; userRole: Role };

function sessionOf(req: unknown): SessionData {
  return (req as { session: SessionData }).session;
}

function routeId(value: string | string[] | undefined): number {
  return Number(Array.isArray(value) ? value[0] : value);
}

function requireRole(roles: Role[]) {
  return (req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]) => {
    const session = sessionOf(req);
    if (!roles.includes(session.userRole)) {
      res.status(403).json({ error: "Pro tuto akci nemáte oprávnění" });
      return;
    }
    next();
  };
}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonNegative(value: unknown): number | null {
  const parsed = optionalNumber(value);
  return parsed == null || parsed < 0 ? null : parsed;
}

async function getUserWorker(userId: number) {
  const [user] = await db
    .select({ workerId: usersTable.workerId, fullName: usersTable.fullName, role: usersTable.role })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), isNull(usersTable.deletedAt)))
    .limit(1);
  return user;
}

async function canReadRecord(recordId: number, session: SessionData) {
  const [record] = await db.select().from(teamDailyRecordsTable).where(and(eq(teamDailyRecordsTable.id, recordId), isNull(teamDailyRecordsTable.deletedAt))).limit(1);
  if (!record) return { record: null, workerId: null };
  if (session.userRole === "manager" && record.createdByUserId === session.userId) return { record, workerId: null };
  if (session.userRole === "admin") return { record, workerId: null };
  if (session.userRole !== "employee" || record.status === "draft") return { record: null, workerId: null };
  const user = await getUserWorker(session.userId);
  if (!user?.workerId) return { record: null, workerId: null };
  const [assignment] = await db.select({ id: teamDailyAssignmentsTable.id }).from(teamDailyAssignmentsTable).where(and(eq(teamDailyAssignmentsTable.dailyRecordId, recordId), eq(teamDailyAssignmentsTable.workerId, user.workerId))).limit(1);
  return assignment ? { record, workerId: user.workerId } : { record: null, workerId: null };
}

router.get("/team-daily-records/options", requireAuth, requireRole(["manager", "employee", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const [regions, weatherTypes, machines, accessories, vehicles] = await Promise.all([
    db.select({ id: regionsTable.id, name: regionsTable.name, code: regionsTable.code }).from(regionsTable).where(and(eq(regionsTable.isActive, true), isNull(regionsTable.deletedAt))).orderBy(regionsTable.name),
    db.select({ id: weatherTypesTable.id, name: weatherTypesTable.name, icon: weatherTypesTable.icon }).from(weatherTypesTable).where(and(eq(weatherTypesTable.isActive, true), isNull(weatherTypesTable.deletedAt))).orderBy(weatherTypesTable.name),
    db.select({ id: machinesTable.id, name: machinesTable.name, type: machinesTable.type, defaultAccessoryId: machinesTable.defaultAccessoryId }).from(machinesTable).where(and(eq(machinesTable.isActive, true), isNull(machinesTable.deletedAt))).orderBy(machinesTable.name),
    db.select({ id: accessoriesTable.id, name: accessoriesTable.name, type: accessoriesTable.type }).from(accessoriesTable).where(and(eq(accessoriesTable.isActive, true), isNull(accessoriesTable.deletedAt))).orderBy(accessoriesTable.name),
    db.select({ id: vehiclesTable.id, name: vehiclesTable.name, licensePlate: vehiclesTable.licensePlate }).from(vehiclesTable).where(and(eq(vehiclesTable.isActive, true), isNull(vehiclesTable.deletedAt))).orderBy(vehiclesTable.name),
  ]);

  const workers = session.userRole === "manager" || session.userRole === "admin"
    ? await db
      .select({ id: workersTable.id, firstName: workersTable.firstName, lastName: workersTable.lastName, isActive: workersTable.isActive, contractorCompanyId: workersTable.contractorCompanyId, defaultBrushcutter: workersTable.defaultBrushcutter })
      .from(workersTable)
      .innerJoin(usersTable, and(eq(usersTable.workerId, workersTable.id), eq(usersTable.role, "employee"), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
      .where(and(eq(workersTable.isActive, true), isNull(workersTable.deletedAt), isNull(workersTable.contractorCompanyId)))
      .orderBy(workersTable.lastName, workersTable.firstName)
    : session.userRole === "employee"
      ? await db
        .select({ id: workersTable.id, firstName: workersTable.firstName, lastName: workersTable.lastName, isActive: workersTable.isActive, contractorCompanyId: workersTable.contractorCompanyId, defaultBrushcutter: workersTable.defaultBrushcutter })
        .from(usersTable)
        .innerJoin(workersTable, eq(usersTable.workerId, workersTable.id))
        .where(and(eq(usersTable.id, session.userId), eq(usersTable.isActive, true), isNull(usersTable.deletedAt), eq(workersTable.isActive, true), isNull(workersTable.deletedAt), isNull(workersTable.contractorCompanyId)))
        .limit(1)
      : [];

  res.json({ regions, weatherTypes, machines, accessories, vehicles, workers });
});

router.get("/team-daily-records", requireAuth, requireRole(["manager", "employee", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const archive = req.query.archive === "1" || req.query.archive === "true";
  const all = session.userRole === "admin" && (req.query.all === "1" || req.query.all === "true");
  let records;
  if (session.userRole === "employee") {
    const user = await getUserWorker(session.userId);
    if (!user?.workerId) { res.json([]); return; }
    records = await db
      .select({ record: teamDailyRecordsTable })
      .from(teamDailyAssignmentsTable)
      .innerJoin(teamDailyRecordsTable, eq(teamDailyAssignmentsTable.dailyRecordId, teamDailyRecordsTable.id))
      .where(and(eq(teamDailyAssignmentsTable.workerId, user.workerId), isNull(teamDailyRecordsTable.deletedAt), eq(teamDailyRecordsTable.status, archive ? "closed" : "open")))
      .orderBy(desc(teamDailyRecordsTable.date), desc(teamDailyRecordsTable.id));
  } else {
    const statusCondition = all ? undefined : archive ? eq(teamDailyRecordsTable.status, "closed") : inArray(teamDailyRecordsTable.status, ["draft", "open"]);
    const condition = session.userRole === "admin"
      ? and(isNull(teamDailyRecordsTable.deletedAt), statusCondition)
      : and(eq(teamDailyRecordsTable.createdByUserId, session.userId), isNull(teamDailyRecordsTable.deletedAt), statusCondition);
    records = (await db.select({ record: teamDailyRecordsTable }).from(teamDailyRecordsTable).where(condition).orderBy(desc(teamDailyRecordsTable.date), desc(teamDailyRecordsTable.id)));
  }
  const plainRecords = records.map((item) => item.record);
  if (plainRecords.length === 0) { res.json([]); return; }
  const recordIds = plainRecords.map((record) => record.id);
  const creatorIds = [...new Set(plainRecords.map((record) => record.createdByUserId))];
  const [creators, assignments, entries] = await Promise.all([
    db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(inArray(usersTable.id, creatorIds)),
    db.select({ dailyRecordId: teamDailyAssignmentsTable.dailyRecordId }).from(teamDailyAssignmentsTable).where(inArray(teamDailyAssignmentsTable.dailyRecordId, recordIds)),
    db.select({ dailyRecordId: teamDailyEntriesTable.dailyRecordId }).from(teamDailyEntriesTable).where(inArray(teamDailyEntriesTable.dailyRecordId, recordIds)),
  ]);
  const creatorNames = new Map(creators.map((creator) => [creator.id, creator.fullName]));
  const assignmentCounts = new Map<number, number>();
  const entryCounts = new Map<number, number>();
  assignments.forEach(({ dailyRecordId }) => assignmentCounts.set(dailyRecordId, (assignmentCounts.get(dailyRecordId) ?? 0) + 1));
  entries.forEach(({ dailyRecordId }) => entryCounts.set(dailyRecordId, (entryCounts.get(dailyRecordId) ?? 0) + 1));
  res.json(plainRecords.map((record) => ({
    ...record,
    creatorName: creatorNames.get(record.createdByUserId) ?? null,
    assignmentCount: assignmentCounts.get(record.id) ?? 0,
    entryCount: entryCounts.get(record.id) ?? 0,
  })));
});

router.post("/team-daily-records", requireAuth, requireRole(["manager", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const { date, regionId, location, weatherTypeId, temperature, workerIds, status } = req.body as {
    date?: string; regionId?: number; location?: string | null; weatherTypeId?: number | null; temperature?: number | null; workerIds?: number[]; status?: string;
  };
  const uniqueWorkerIds = [...new Set((workerIds ?? []).map(Number).filter(Number.isInteger))];
  if (!date || !Number.isInteger(Number(regionId)) || uniqueWorkerIds.length === 0) {
    res.status(400).json({ error: "Datum, revír a alespoň jeden pracovník jsou povinné" });
    return;
  }
  if (!['draft', 'open'].includes(status ?? 'open')) { res.status(400).json({ error: "Neplatný stav záznamu" }); return; }

  const validWorkers = await db
    .select({ id: workersTable.id })
    .from(workersTable)
    .innerJoin(usersTable, and(eq(usersTable.workerId, workersTable.id), eq(usersTable.role, "employee"), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .where(and(inArray(workersTable.id, uniqueWorkerIds), eq(workersTable.isActive, true), isNull(workersTable.deletedAt), isNull(workersTable.contractorCompanyId)));
  if (validWorkers.length !== uniqueWorkerIds.length) { res.status(400).json({ error: "Některý pracovník není aktivní nebo nemá účet s rolí Pracovník" }); return; }

  const record = await db.transaction(async (tx) => {
    const [created] = await tx.insert(teamDailyRecordsTable).values({
      date,
      workCategory: "sheep",
      regionId: Number(regionId),
      location: location?.trim() || null,
      weatherTypeId: weatherTypeId ? Number(weatherTypeId) : null,
      temperature: optionalNumber(temperature),
      status: (status ?? "open") as "draft" | "open",
      createdByUserId: session.userId,
    }).returning();
    await tx.insert(teamDailyAssignmentsTable).values(uniqueWorkerIds.map((workerId) => ({ dailyRecordId: created.id, workerId })));
    return created;
  });

  await logAudit({ userId: session.userId, action: "create", tableName: "team_daily_records", recordId: record.id, description: `Vedoucí vytvořil denní záznam Ovečky pro ${uniqueWorkerIds.length} pracovníků`, newData: { date, regionId, location, weatherTypeId, temperature, workerIds: uniqueWorkerIds, status: record.status } });
  res.status(201).json(record);
});

router.get("/team-daily-records/:id", requireAuth, requireRole(["manager", "employee", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const access = await canReadRecord(id, session);
  if (!access.record) { res.status(404).json({ error: "Denní záznam nebyl nalezen" }); return; }

  const [region, weather, creator, assignments, entries] = await Promise.all([
    db.select({ id: regionsTable.id, name: regionsTable.name, code: regionsTable.code }).from(regionsTable).where(eq(regionsTable.id, access.record.regionId)).limit(1),
    access.record.weatherTypeId ? db.select({ id: weatherTypesTable.id, name: weatherTypesTable.name, icon: weatherTypesTable.icon }).from(weatherTypesTable).where(eq(weatherTypesTable.id, access.record.weatherTypeId)).limit(1) : Promise.resolve([]),
    db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, access.record.createdByUserId)).limit(1),
    db.select({ workerId: workersTable.id, firstName: workersTable.firstName, lastName: workersTable.lastName }).from(teamDailyAssignmentsTable).innerJoin(workersTable, eq(teamDailyAssignmentsTable.workerId, workersTable.id)).where(eq(teamDailyAssignmentsTable.dailyRecordId, id)).orderBy(asc(workersTable.lastName), asc(workersTable.firstName)),
    db.select({ id: teamDailyEntriesTable.id, workerId: teamDailyEntriesTable.workerId, userId: teamDailyEntriesTable.userId, fullName: usersTable.fullName, machineEntries: teamDailyEntriesTable.machineEntries, vehicleEntries: teamDailyEntriesTable.vehicleEntries, note: teamDailyEntriesTable.note, submittedAt: teamDailyEntriesTable.submittedAt, updatedAt: teamDailyEntriesTable.updatedAt }).from(teamDailyEntriesTable).innerJoin(usersTable, eq(teamDailyEntriesTable.userId, usersTable.id)).where(eq(teamDailyEntriesTable.dailyRecordId, id)).orderBy(asc(usersTable.fullName)),
  ]);

  const visibleEntries = session.userRole === "employee" ? entries.filter((entry) => entry.workerId === access.workerId) : entries;
  res.json({ ...access.record, region: region[0] ?? null, weather: weather[0] ?? null, creator: creator[0] ?? null, assignments, entries: visibleEntries, myWorkerId: access.workerId });
});

router.put("/team-daily-records/:id", requireAuth, requireRole(["manager", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const access = await canReadRecord(id, session);
  if (!access.record) { res.status(404).json({ error: "Denní záznam nebyl nalezen" }); return; }

  const { date, regionId, location, weatherTypeId, temperature, workerIds } = req.body as {
    date?: string; regionId?: number; location?: string | null; weatherTypeId?: number | null; temperature?: number | null; workerIds?: number[];
  };
  const uniqueWorkerIds = [...new Set((workerIds ?? []).map(Number).filter(Number.isInteger))];
  if (!date || !Number.isInteger(Number(regionId)) || uniqueWorkerIds.length === 0) {
    res.status(400).json({ error: "Datum, revír a alespoň jeden pracovník jsou povinné" });
    return;
  }

  const [region, validWorkers, currentAssignments, submittedEntries] = await Promise.all([
    db.select({ id: regionsTable.id }).from(regionsTable).where(and(eq(regionsTable.id, Number(regionId)), eq(regionsTable.isActive, true), isNull(regionsTable.deletedAt))).limit(1),
    db.select({ id: workersTable.id }).from(workersTable)
      .innerJoin(usersTable, and(eq(usersTable.workerId, workersTable.id), eq(usersTable.role, "employee"), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
      .where(and(inArray(workersTable.id, uniqueWorkerIds), eq(workersTable.isActive, true), isNull(workersTable.deletedAt), isNull(workersTable.contractorCompanyId))),
    db.select({ workerId: teamDailyAssignmentsTable.workerId }).from(teamDailyAssignmentsTable).where(eq(teamDailyAssignmentsTable.dailyRecordId, id)),
    db.select({ workerId: teamDailyEntriesTable.workerId }).from(teamDailyEntriesTable).where(eq(teamDailyEntriesTable.dailyRecordId, id)),
  ]);
  if (!region[0]) { res.status(400).json({ error: "Vybraný revír není aktivní" }); return; }
  if (validWorkers.length !== uniqueWorkerIds.length) { res.status(400).json({ error: "Některý pracovník není aktivní nebo nemá účet s rolí Pracovník" }); return; }

  const currentWorkerIds = currentAssignments.map(({ workerId }) => workerId);
  const removedWorkerIds = currentWorkerIds.filter((workerId) => !uniqueWorkerIds.includes(workerId));
  const addedWorkerIds = uniqueWorkerIds.filter((workerId) => !currentWorkerIds.includes(workerId));
  const submittedWorkerIds = new Set(submittedEntries.map(({ workerId }) => workerId));
  if (removedWorkerIds.some((workerId) => submittedWorkerIds.has(workerId))) {
    res.status(409).json({ error: "Nelze odebrat pracovníka, který už uložil svůj zápis. Jeho data zůstávají chráněná." });
    return;
  }

  const updated = await db.transaction(async (tx) => {
    const [record] = await tx.update(teamDailyRecordsTable).set({
      date,
      regionId: Number(regionId),
      location: location?.trim() || null,
      weatherTypeId: weatherTypeId ? Number(weatherTypeId) : null,
      temperature: optionalNumber(temperature),
      updatedAt: new Date(),
    }).where(eq(teamDailyRecordsTable.id, id)).returning();
    if (removedWorkerIds.length) {
      await tx.delete(teamDailyAssignmentsTable).where(and(eq(teamDailyAssignmentsTable.dailyRecordId, id), inArray(teamDailyAssignmentsTable.workerId, removedWorkerIds)));
    }
    if (addedWorkerIds.length) {
      await tx.insert(teamDailyAssignmentsTable).values(addedWorkerIds.map((workerId) => ({ dailyRecordId: id, workerId })));
    }
    return record;
  });

  await logAudit({
    userId: session.userId,
    action: "update",
    tableName: "team_daily_records",
    recordId: id,
    description: `Upraven denní záznam Ovečky; viditelnost pro ${uniqueWorkerIds.length} pracovníků`,
    oldData: { date: access.record.date, regionId: access.record.regionId, location: access.record.location, weatherTypeId: access.record.weatherTypeId, temperature: access.record.temperature, workerIds: currentWorkerIds },
    newData: { date, regionId: Number(regionId), location: location?.trim() || null, weatherTypeId: weatherTypeId ? Number(weatherTypeId) : null, temperature: optionalNumber(temperature), workerIds: uniqueWorkerIds },
  });
  res.json(updated);
});

router.patch("/team-daily-records/:id/status", requireAuth, requireRole(["manager", "admin"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const status = String(req.body?.status ?? "");
  if (!['draft', 'open', 'closed'].includes(status)) { res.status(400).json({ error: "Neplatný stav" }); return; }
  const access = await canReadRecord(id, session);
  if (!access.record) { res.status(404).json({ error: "Denní záznam nebyl nalezen" }); return; }
  const [record] = await db.update(teamDailyRecordsTable).set({ status: status as "draft" | "open" | "closed" }).where(eq(teamDailyRecordsTable.id, id)).returning();
  await logAudit({ userId: session.userId, action: "update", tableName: "team_daily_records", recordId: id, description: `Stav denního záznamu změněn na ${status}`, oldData: { status: access.record.status }, newData: { status } });
  res.json(record);
});

router.put("/team-daily-records/:id/my-entry", requireAuth, requireRole(["employee"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const access = await canReadRecord(id, session);
  if (!access.record || !access.workerId) { res.status(404).json({ error: "Denní záznam nebyl nalezen" }); return; }
  if (access.record.status !== "open") { res.status(409).json({ error: "Tento denní záznam není otevřený pro úpravy" }); return; }

  const rawMachines: Array<Record<string, unknown>> = Array.isArray(req.body?.machineEntries) ? req.body.machineEntries : [];
  const rawVehicles: Array<Record<string, unknown>> = Array.isArray(req.body?.vehicleEntries) ? req.body.vehicleEntries : [];
  if (rawMachines.length === 0) { res.status(400).json({ error: "Přidejte alespoň jeden stroj" }); return; }
  if (rawMachines.length > 20 || rawVehicles.length > 20) { res.status(400).json({ error: "Příliš mnoho položek v jednom zápisu" }); return; }

  const machineEntries = rawMachines.map((item: Record<string, unknown>) => {
    const mthStart = nonNegative(item.mthStart);
    const mthEnd = nonNegative(item.mthEnd);
    return {
      machineId: Number(item.machineId),
      accessoryId: item.accessoryId ? Number(item.accessoryId) : null,
      mthStart,
      mthEnd,
      mthTotal: mthStart != null && mthEnd != null ? Math.round((mthEnd - mthStart) * 100) / 100 : null,
      fuelConsumption: nonNegative(item.fuelConsumption),
      refueling: nonNegative(item.refueling),
    };
  });
  const vehicleEntries = rawVehicles.map((item: Record<string, unknown>) => {
    const kmStart = nonNegative(item.kmStart);
    const kmEnd = nonNegative(item.kmEnd);
    return {
      vehicleId: Number(item.vehicleId),
      kmStart,
      kmEnd,
      kmTotal: kmStart != null && kmEnd != null ? Math.round((kmEnd - kmStart) * 100) / 100 : null,
      refueling: nonNegative(item.refueling),
    };
  });

  if (machineEntries.some((item) => !Number.isInteger(item.machineId) || item.mthStart == null || item.mthEnd == null || item.mthEnd < item.mthStart)) {
    res.status(400).json({ error: "U každého stroje vyplňte platné MTH; konečný stav nesmí být nižší" }); return;
  }
  if (vehicleEntries.some((item) => !Number.isInteger(item.vehicleId) || item.kmStart == null || item.kmEnd == null || item.kmEnd < item.kmStart)) {
    res.status(400).json({ error: "U každého auta vyplňte platné kilometry; konečný stav nesmí být nižší" }); return;
  }

  const machineIds = [...new Set(machineEntries.map((item) => item.machineId))];
  const vehicleIds = [...new Set(vehicleEntries.map((item) => item.vehicleId))];
  const [validMachines, validVehicles] = await Promise.all([
    db.select({ id: machinesTable.id }).from(machinesTable).where(and(inArray(machinesTable.id, machineIds), eq(machinesTable.isActive, true), isNull(machinesTable.deletedAt))),
    vehicleIds.length ? db.select({ id: vehiclesTable.id }).from(vehiclesTable).where(and(inArray(vehiclesTable.id, vehicleIds), eq(vehiclesTable.isActive, true), isNull(vehiclesTable.deletedAt))) : Promise.resolve([]),
  ]);
  if (validMachines.length !== machineIds.length || validVehicles.length !== vehicleIds.length) { res.status(400).json({ error: "Vybraný stroj nebo auto není aktivní" }); return; }

  const [entry] = await db.insert(teamDailyEntriesTable).values({
    dailyRecordId: id,
    userId: session.userId,
    workerId: access.workerId,
    machineEntries,
    vehicleEntries,
    note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null,
    submittedAt: new Date(),
  }).onConflictDoUpdate({
    target: [teamDailyEntriesTable.dailyRecordId, teamDailyEntriesTable.workerId],
    set: { userId: session.userId, machineEntries, vehicleEntries, note: typeof req.body?.note === "string" ? req.body.note.trim() || null : null, submittedAt: new Date(), updatedAt: new Date() },
  }).returning();

  await logAudit({ userId: session.userId, action: "update", tableName: "team_daily_entries", recordId: entry.id, description: `Pracovník uložil svůj zápis k dennímu záznamu #${id}`, newData: { workerId: access.workerId, machineCount: machineEntries.length, vehicleCount: vehicleEntries.length } });
  res.json(entry);
});

export default router;
