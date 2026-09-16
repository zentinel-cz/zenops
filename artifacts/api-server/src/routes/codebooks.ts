import { Router } from "express";
import { db, usersTable, workersTable, contractorCompaniesTable, vehiclesTable, machinesTable, regionsTable, weatherTypesTable, mowingRecordsTable, mowingRecordMachinesTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireOperationsAccess, requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";
import { queryString } from "../lib/query";
import { normalizeMachineMthEntries, parseDbNumber } from "../lib/recordFields";

const router = Router();

function getSession(req: unknown) {
  return (req as { session: { userId: number } }).session;
}

// ─── SUBDODAVATELSKÉ FIRMY ──────────────────────────────────────────────────

router.get("/contractor-companies", requireOperationsAccess, async (_req, res): Promise<void> => {
  const companies = await db.select().from(contractorCompaniesTable).where(isNull(contractorCompaniesTable.deletedAt)).orderBy(contractorCompaniesTable.name);
  res.json(companies);
});

router.post("/contractor-companies", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { name, companyId, note, isActive } = req.body as { name?: string; companyId?: string | null; note?: string | null; isActive?: boolean };
  if (!name?.trim()) { res.status(400).json({ error: "Název firmy je povinný" }); return; }
  const [company] = await db.insert(contractorCompaniesTable).values({ name: name.trim(), companyId: companyId?.trim() || null, note: note?.trim() || null, isActive: isActive ?? true }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "contractor_companies", recordId: company.id, description: `Vytvořena subdodavatelská firma ${company.name}`, newData: company as Record<string, unknown> });
  res.status(201).json(company);
});

router.patch("/contractor-companies/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, companyId, note, isActive } = req.body as { name?: string; companyId?: string | null; note?: string | null; isActive?: boolean };
  const [before] = await db.select().from(contractorCompaniesTable).where(eq(contractorCompaniesTable.id, id));
  if (!before) { res.status(404).json({ error: "Firma nenalezena" }); return; }
  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) { res.status(400).json({ error: "Název firmy je povinný" }); return; }
    updates.name = name.trim();
  }
  if (companyId !== undefined) updates.companyId = companyId?.trim() || null;
  if (note !== undefined) updates.note = note?.trim() || null;
  if (isActive !== undefined) updates.isActive = isActive;
  const [company] = await db.update(contractorCompaniesTable).set(updates).where(eq(contractorCompaniesTable.id, id)).returning();
  await logAudit({ userId: session.userId, action: "update", tableName: "contractor_companies", recordId: id, description: `Upravena subdodavatelská firma ${company.name}`, oldData: before as Record<string, unknown>, newData: company as Record<string, unknown> });
  res.json(company);
});

router.delete("/contractor-companies/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(contractorCompaniesTable).where(eq(contractorCompaniesTable.id, id));
  if (!before) { res.status(404).json({ error: "Firma nenalezena" }); return; }
  const linkedWorkers = await db.select({ id: workersTable.id }).from(workersTable).where(and(eq(workersTable.contractorCompanyId, id), isNull(workersTable.deletedAt)));
  if (linkedWorkers.length > 0) { res.status(409).json({ error: "Firmu nelze smazat, dokud má přiřazené pracovníky" }); return; }
  await db.update(contractorCompaniesTable).set({ deletedAt: new Date() }).where(eq(contractorCompaniesTable.id, id));
  await logAudit({ userId: session.userId, action: "delete", tableName: "contractor_companies", recordId: id, description: `Smazána subdodavatelská firma ${before.name}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Firma smazána" });
});

// ─── WORKERS ──────────────────────────────────────────────────────────────────

router.get("/workers", requireOperationsAccess, async (_req, res): Promise<void> => {
  const workers = await db.select().from(workersTable).where(isNull(workersTable.deletedAt)).orderBy(workersTable.lastName);
  res.json(workers);
});

router.post("/workers", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { firstName, lastName, note, isActive, defaultBrushcutter, defaultSlopeMower, contractorCompanyId, defaultSubcontractor } = req.body as { firstName?: string; lastName?: string; note?: string; isActive?: boolean; defaultBrushcutter?: boolean; defaultSlopeMower?: boolean; contractorCompanyId?: number | null; defaultSubcontractor?: boolean };
  if (!firstName || !lastName) { res.status(400).json({ error: "Jméno a příjmení jsou povinné" }); return; }
  const [w] = await db.insert(workersTable).values({ firstName, lastName, note, isActive: isActive ?? true, defaultBrushcutter: defaultBrushcutter ?? false, defaultSlopeMower: defaultSlopeMower ?? false, contractorCompanyId: contractorCompanyId ?? null, defaultSubcontractor: defaultSubcontractor ?? false }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "workers", recordId: w.id, description: `Vytvořen pracovník ${w.firstName} ${w.lastName}`, newData: { firstName: w.firstName, lastName: w.lastName } });
  res.status(201).json(w);
});

router.patch("/workers/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { firstName, lastName, note, isActive, defaultBrushcutter, defaultSlopeMower, contractorCompanyId, defaultSubcontractor } = req.body as { firstName?: string; lastName?: string; note?: string; isActive?: boolean; defaultBrushcutter?: boolean; defaultSlopeMower?: boolean; contractorCompanyId?: number | null; defaultSubcontractor?: boolean };
  const [before] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  const updates: Record<string, unknown> = {};
  if (firstName != null) updates.firstName = firstName;
  if (lastName != null) updates.lastName = lastName;
  if (note !== undefined) updates.note = note;
  if (isActive != null) updates.isActive = isActive;
  if (defaultBrushcutter != null) updates.defaultBrushcutter = defaultBrushcutter;
  if (defaultSlopeMower != null) updates.defaultSlopeMower = defaultSlopeMower;
  if (contractorCompanyId !== undefined) updates.contractorCompanyId = contractorCompanyId;
  if (defaultSubcontractor != null) updates.defaultSubcontractor = defaultSubcontractor;
  const [w] = await db.update(workersTable).set(updates).where(eq(workersTable.id, id)).returning();
  if (!w) { res.status(404).json({ error: "Pracovník nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "update", tableName: "workers", recordId: id, description: `Upraven pracovník ${w.firstName} ${w.lastName}`, oldData: before as Record<string, unknown>, newData: w as Record<string, unknown> });
  res.json(w);
});

router.delete("/workers/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(workersTable).where(eq(workersTable.id, id));
  const [w] = await db.update(workersTable).set({ deletedAt: new Date() }).where(eq(workersTable.id, id)).returning({ id: workersTable.id });
  if (!w) { res.status(404).json({ error: "Pracovník nenalezen" }); return; }
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.workerId, id));
  await logAudit({ userId: session.userId, action: "delete", tableName: "workers", recordId: id, description: `Smazán pracovník ${before?.firstName ?? ""} ${before?.lastName ?? ""}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Pracovník smazán" });
});

// ─── VEHICLES ─────────────────────────────────────────────────────────────────

router.get("/vehicles", requireOperationsAccess, async (_req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable).where(isNull(vehiclesTable.deletedAt)).orderBy(vehiclesTable.name);
  res.json(vehicles);
});

router.post("/vehicles", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { name, licensePlate, note, isActive, defaultSlopeMower } = req.body as { name?: string; licensePlate?: string; note?: string; isActive?: boolean; defaultSlopeMower?: boolean };
  if (!name) { res.status(400).json({ error: "Název je povinný" }); return; }
  const [v] = await db.insert(vehiclesTable).values({ name, licensePlate, note, isActive: isActive ?? true, defaultSlopeMower: defaultSlopeMower ?? false }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "vehicles", recordId: v.id, description: `Vytvořeno vozidlo ${v.name}${v.licensePlate ? ` (${v.licensePlate})` : ""}`, newData: { name: v.name, licensePlate: v.licensePlate } });
  res.status(201).json(v);
});

router.patch("/vehicles/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, licensePlate, note, isActive, defaultSlopeMower } = req.body as { name?: string; licensePlate?: string; note?: string; isActive?: boolean; defaultSlopeMower?: boolean };
  const [before] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (licensePlate !== undefined) updates.licensePlate = licensePlate;
  if (note !== undefined) updates.note = note;
  if (isActive != null) updates.isActive = isActive;
  if (defaultSlopeMower != null) updates.defaultSlopeMower = defaultSlopeMower;
  const [v] = await db.update(vehiclesTable).set(updates).where(eq(vehiclesTable.id, id)).returning();
  if (!v) { res.status(404).json({ error: "Vozidlo nenalezeno" }); return; }
  await logAudit({ userId: session.userId, action: "update", tableName: "vehicles", recordId: id, description: `Upraveno vozidlo ${v.name}`, oldData: before as Record<string, unknown>, newData: v as Record<string, unknown> });
  res.json(v);
});

router.delete("/vehicles/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
  const [v] = await db.update(vehiclesTable).set({ deletedAt: new Date() }).where(eq(vehiclesTable.id, id)).returning({ id: vehiclesTable.id });
  if (!v) { res.status(404).json({ error: "Vozidlo nenalezeno" }); return; }
  await logAudit({ userId: session.userId, action: "delete", tableName: "vehicles", recordId: id, description: `Smazáno vozidlo ${before?.name ?? id}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Vozidlo smazáno" });
});

// ─── MACHINES ─────────────────────────────────────────────────────────────────

router.get("/machines", requireOperationsAccess, async (_req, res): Promise<void> => {
  const machines = await db.select().from(machinesTable).where(isNull(machinesTable.deletedAt)).orderBy(machinesTable.name);
  res.json(machines);
});

router.post("/machines", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { name, type, note, isActive, defaultAccessoryId, defaultOperatorId, mowingCategory } = req.body as { name?: string; type?: string; note?: string; isActive?: boolean; defaultAccessoryId?: number | null; defaultOperatorId?: number | null; mowingCategory?: string | null };
  if (!name || !type) { res.status(400).json({ error: "Název a typ jsou povinné" }); return; }
  const [m] = await db.insert(machinesTable).values({ name, type, note, isActive: isActive ?? true, defaultAccessoryId: defaultAccessoryId ?? null, defaultOperatorId: defaultOperatorId ?? null, mowingCategory: mowingCategory ?? null }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "machines", recordId: m.id, description: `Vytvořen stroj ${m.name} (${m.type})`, newData: { name: m.name, type: m.type } });
  res.status(201).json(m);
});

router.patch("/machines/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, type, note, isActive, defaultAccessoryId, defaultOperatorId, mowingCategory } = req.body as { name?: string; type?: string; note?: string; isActive?: boolean; defaultAccessoryId?: number | null; defaultOperatorId?: number | null; mowingCategory?: string | null };
  const [before] = await db.select().from(machinesTable).where(eq(machinesTable.id, id));
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (type != null) updates.type = type;
  if (note !== undefined) updates.note = note;
  if (isActive != null) updates.isActive = isActive;
  if (defaultAccessoryId !== undefined) updates.defaultAccessoryId = defaultAccessoryId;
  if (defaultOperatorId !== undefined) updates.defaultOperatorId = defaultOperatorId;
  if (mowingCategory !== undefined) updates.mowingCategory = mowingCategory;
  const [m] = await db.update(machinesTable).set(updates).where(eq(machinesTable.id, id)).returning();
  if (!m) { res.status(404).json({ error: "Stroj nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "update", tableName: "machines", recordId: id, description: `Upraven stroj ${m.name}`, oldData: before as Record<string, unknown>, newData: m as Record<string, unknown> });
  res.json(m);
});

router.get("/machines/:id/last-mth", requireOperationsAccess, async (req, res): Promise<void> => {
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Neplatné ID stroje" }); return; }

  const rows = await db
    .select({ record: mowingRecordsTable })
    .from(mowingRecordMachinesTable)
    .innerJoin(mowingRecordsTable, eq(mowingRecordMachinesTable.mowingRecordId, mowingRecordsTable.id))
    .where(and(eq(mowingRecordMachinesTable.machineId, id), isNull(mowingRecordsTable.deletedAt)))
    .orderBy(desc(mowingRecordsTable.date), desc(mowingRecordsTable.id));

  for (const { record } of rows) {
    const entry = normalizeMachineMthEntries(record.machineMthEntries).find((item) => item.machineId === id);
    const value = entry?.mthEnd ?? (rows.length === 1 ? parseDbNumber(record.mthEnd) : null);
    if (value != null) { res.json({ machineId: id, mthEnd: value, recordDate: record.date }); return; }
  }

  res.json({ machineId: id, mthEnd: null, recordDate: null });
});

router.delete("/machines/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(machinesTable).where(eq(machinesTable.id, id));
  const [m] = await db.update(machinesTable).set({ deletedAt: new Date() }).where(eq(machinesTable.id, id)).returning({ id: machinesTable.id });
  if (!m) { res.status(404).json({ error: "Stroj nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "delete", tableName: "machines", recordId: id, description: `Smazán stroj ${before?.name ?? id}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Stroj smazán" });
});

// ─── REGIONS ──────────────────────────────────────────────────────────────────

router.get("/regions", requireOperationsAccess, async (_req, res): Promise<void> => {
  const regions = await db.select().from(regionsTable).where(isNull(regionsTable.deletedAt)).orderBy(regionsTable.name);
  res.json(regions);
});

router.post("/regions", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { name, code, note, isActive } = req.body as { name?: string; code?: string; note?: string; isActive?: boolean };
  if (!name) { res.status(400).json({ error: "Název je povinný" }); return; }
  const [r] = await db.insert(regionsTable).values({ name, code, note, isActive: isActive ?? true }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "regions", recordId: r.id, description: `Vytvořen revír ${r.name}${r.code ? ` (${r.code})` : ""}`, newData: { name: r.name, code: r.code } });
  res.status(201).json(r);
});

router.patch("/regions/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, code, note, isActive } = req.body as { name?: string; code?: string; note?: string; isActive?: boolean };
  const [before] = await db.select().from(regionsTable).where(eq(regionsTable.id, id));
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (code !== undefined) updates.code = code;
  if (note !== undefined) updates.note = note;
  if (isActive != null) updates.isActive = isActive;
  const [r] = await db.update(regionsTable).set(updates).where(eq(regionsTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Revír nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "update", tableName: "regions", recordId: id, description: `Upraven revír ${r.name}`, oldData: before as Record<string, unknown>, newData: r as Record<string, unknown> });
  res.json(r);
});

router.delete("/regions/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(regionsTable).where(eq(regionsTable.id, id));
  const [r] = await db.update(regionsTable).set({ deletedAt: new Date() }).where(eq(regionsTable.id, id)).returning({ id: regionsTable.id });
  if (!r) { res.status(404).json({ error: "Revír nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "delete", tableName: "regions", recordId: id, description: `Smazán revír ${before?.name ?? id}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Revír smazán" });
});

// ─── WEATHER TYPES ────────────────────────────────────────────────────────────

router.get("/weather-types", requireOperationsAccess, async (_req, res): Promise<void> => {
  const wt = await db.select().from(weatherTypesTable).where(isNull(weatherTypesTable.deletedAt)).orderBy(weatherTypesTable.name);
  res.json(wt);
});

router.post("/weather-types", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const { name, icon, isActive } = req.body as { name?: string; icon?: string; isActive?: boolean };
  if (!name) { res.status(400).json({ error: "Název je povinný" }); return; }
  const [wt] = await db.insert(weatherTypesTable).values({ name, icon, isActive: isActive ?? true }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "weather_types", recordId: wt.id, description: `Vytvořen typ počasí ${wt.name}`, newData: { name: wt.name, icon: wt.icon } });
  res.status(201).json(wt);
});

router.patch("/weather-types/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, icon, isActive } = req.body as { name?: string; icon?: string; isActive?: boolean };
  const [before] = await db.select().from(weatherTypesTable).where(eq(weatherTypesTable.id, id));
  const updates: Record<string, unknown> = {};
  if (name != null) updates.name = name;
  if (icon !== undefined) updates.icon = icon;
  if (isActive != null) updates.isActive = isActive;
  const [wt] = await db.update(weatherTypesTable).set(updates).where(eq(weatherTypesTable.id, id)).returning();
  if (!wt) { res.status(404).json({ error: "Typ počasí nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "update", tableName: "weather_types", recordId: id, description: `Upraven typ počasí ${wt.name}`, oldData: before as Record<string, unknown>, newData: wt as Record<string, unknown> });
  res.json(wt);
});

router.delete("/weather-types/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = getSession(req);
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const [before] = await db.select().from(weatherTypesTable).where(eq(weatherTypesTable.id, id));
  const [wt] = await db.update(weatherTypesTable).set({ deletedAt: new Date() }).where(eq(weatherTypesTable.id, id)).returning({ id: weatherTypesTable.id });
  if (!wt) { res.status(404).json({ error: "Typ počasí nenalezen" }); return; }
  await logAudit({ userId: session.userId, action: "delete", tableName: "weather_types", recordId: id, description: `Smazán typ počasí ${before?.name ?? id}`, oldData: before as Record<string, unknown> });
  res.json({ message: "Typ počasí smazán" });
});

export default router;
