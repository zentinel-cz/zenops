import { Router } from "express";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import {
  contractorCompaniesTable,
  db,
  subcontractorDailyRecordsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

type Role = "admin" | "subcontractor";
type SessionData = { userId: number; userRole: string };

function sessionOf(req: unknown): SessionData {
  return (req as { session: SessionData }).session;
}

function requireRole(roles: Role[]) {
  return (req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]) => {
    if (!roles.includes(sessionOf(req).userRole as Role)) {
      res.status(403).json({ error: "Pro tuto akci nemáte oprávnění" });
      return;
    }
    next();
  };
}

function routeId(value: string | string[] | undefined): number {
  return Number(Array.isArray(value) ? value[0] : value);
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function monthRange(value: unknown): { start: string; end: string } | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  const next = new Date(Date.UTC(year, month, 1));
  return { start: `${value}-01`, end: next.toISOString().slice(0, 10) };
}

async function currentUser(userId: number) {
  const [user] = await db.select({ id: usersTable.id, role: usersTable.role, contractorCompanyId: usersTable.contractorCompanyId })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.isActive, true), isNull(usersTable.deletedAt)))
    .limit(1);
  return user;
}

router.get("/subcontractor-daily-records", requireAuth, requireRole(["admin", "subcontractor"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const user = await currentUser(session.userId);
  if (!user) { res.status(401).json({ error: "Nepřihlášen" }); return; }
  if (user.role !== "admin" && user.role !== "subcontractor") { res.status(403).json({ error: "Pro tuto akci nemáte oprávnění" }); return; }
  if (user.role === "subcontractor" && !user.contractorCompanyId) { res.status(409).json({ error: "Účet není propojený se subdodavatelskou firmou" }); return; }

  const range = monthRange(req.query.month);
  const conditions = [isNull(subcontractorDailyRecordsTable.deletedAt)];
  if (user.role === "subcontractor") conditions.push(eq(subcontractorDailyRecordsTable.contractorCompanyId, user.contractorCompanyId!));
  if (range) conditions.push(gte(subcontractorDailyRecordsTable.date, range.start), lt(subcontractorDailyRecordsTable.date, range.end));

  const records = await db.select({
    id: subcontractorDailyRecordsTable.id,
    date: subcontractorDailyRecordsTable.date,
    contractorCompanyId: subcontractorDailyRecordsTable.contractorCompanyId,
    companyName: contractorCompaniesTable.name,
    location: subcontractorDailyRecordsTable.location,
    workerCount: subcontractorDailyRecordsTable.workerCount,
    startTime: subcontractorDailyRecordsTable.startTime,
    endTime: subcontractorDailyRecordsTable.endTime,
    createdByUserId: subcontractorDailyRecordsTable.createdByUserId,
    creatorName: usersTable.fullName,
    createdAt: subcontractorDailyRecordsTable.createdAt,
    updatedAt: subcontractorDailyRecordsTable.updatedAt,
  }).from(subcontractorDailyRecordsTable)
    .innerJoin(contractorCompaniesTable, eq(subcontractorDailyRecordsTable.contractorCompanyId, contractorCompaniesTable.id))
    .innerJoin(usersTable, eq(subcontractorDailyRecordsTable.createdByUserId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(subcontractorDailyRecordsTable.date), desc(subcontractorDailyRecordsTable.id));
  res.json(records);
});

router.post("/subcontractor-daily-records", requireAuth, requireRole(["subcontractor"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const user = await currentUser(session.userId);
  if (!user || user.role !== "subcontractor") { res.status(403).json({ error: "Záznam může vložit pouze subdodavatel" }); return; }
  if (!user.contractorCompanyId) { res.status(409).json({ error: "Účet není propojený se subdodavatelskou firmou" }); return; }
  const { date, location, workerCount, startTime, endTime } = req.body as Record<string, unknown>;
  const count = Number(workerCount);
  if (!validDate(date) || typeof location !== "string" || !location.trim() || location.trim().length > 255 || !Number.isInteger(count) || count < 1 || count > 1000 || !validTime(startTime) || !validTime(endTime)) {
    res.status(400).json({ error: "Vyplňte datum, místo zakázky, počet lidí a platný čas od–do" });
    return;
  }
  if (endTime <= startTime) { res.status(400).json({ error: "Čas do musí být později než čas od" }); return; }

  const [record] = await db.insert(subcontractorDailyRecordsTable).values({
    date,
    contractorCompanyId: user.contractorCompanyId,
    location: location.trim(),
    workerCount: count,
    startTime,
    endTime,
    createdByUserId: session.userId,
  }).returning();
  await logAudit({ userId: session.userId, action: "create", tableName: "subcontractor_daily_records", recordId: record.id, description: `Subdodavatel vytvořil denní záznam pro ${count} lidí`, newData: { date, contractorCompanyId: user.contractorCompanyId, location: location.trim(), workerCount: count, startTime, endTime } });
  res.status(201).json(record);
});

router.put("/subcontractor-daily-records/:id", requireAuth, requireRole(["subcontractor"]), async (req, res): Promise<void> => {
  const session = sessionOf(req);
  const id = routeId(req.params.id);
  const user = await currentUser(session.userId);
  if (!user || user.role !== "subcontractor") { res.status(403).json({ error: "Záznam může upravit pouze subdodavatel" }); return; }
  if (!user.contractorCompanyId) { res.status(409).json({ error: "Účet není propojený se subdodavatelskou firmou" }); return; }
  const [before] = await db.select().from(subcontractorDailyRecordsTable).where(and(eq(subcontractorDailyRecordsTable.id, id), eq(subcontractorDailyRecordsTable.createdByUserId, session.userId), eq(subcontractorDailyRecordsTable.contractorCompanyId, user.contractorCompanyId), isNull(subcontractorDailyRecordsTable.deletedAt))).limit(1);
  if (!before) { res.status(404).json({ error: "Denní záznam nebyl nalezen" }); return; }

  const { date, location, workerCount, startTime, endTime } = req.body as Record<string, unknown>;
  const count = Number(workerCount);
  if (!validDate(date) || typeof location !== "string" || !location.trim() || location.trim().length > 255 || !Number.isInteger(count) || count < 1 || count > 1000 || !validTime(startTime) || !validTime(endTime)) {
    res.status(400).json({ error: "Vyplňte datum, místo zakázky, počet lidí a platný čas od–do" });
    return;
  }
  if (endTime <= startTime) { res.status(400).json({ error: "Čas do musí být později než čas od" }); return; }

  const [record] = await db.update(subcontractorDailyRecordsTable).set({ date, location: location.trim(), workerCount: count, startTime, endTime, updatedAt: new Date() }).where(eq(subcontractorDailyRecordsTable.id, id)).returning();
  await logAudit({ userId: session.userId, action: "update", tableName: "subcontractor_daily_records", recordId: id, description: "Subdodavatel upravil svůj denní záznam", oldData: { date: before.date, location: before.location, workerCount: before.workerCount, startTime: before.startTime, endTime: before.endTime }, newData: { date, location: location.trim(), workerCount: count, startTime, endTime } });
  res.json(record);
});

export default router;
