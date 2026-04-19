import { Router } from "express";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/audit-logs", requireAdmin, async (req, res): Promise<void> => {
  const {
    tableName,
    userId: filterUserId,
    action: filterAction,
    dateFrom,
    dateTo,
  } = req.query as {
    tableName?: string;
    userId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  };

  const conditions = [];
  if (tableName) conditions.push(eq(auditLogsTable.tableName, tableName));
  if (filterUserId) conditions.push(eq(auditLogsTable.userId, parseInt(filterUserId, 10)));
  if (filterAction) conditions.push(eq(auditLogsTable.action, filterAction));
  if (dateFrom) conditions.push(gte(auditLogsTable.createdAt, new Date(dateFrom)));
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogsTable.createdAt, end));
  }

  const logs = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      tableName: auditLogsTable.tableName,
      recordId: auditLogsTable.recordId,
      description: auditLogsTable.description,
      oldData: auditLogsTable.oldData,
      newData: auditLogsTable.newData,
      createdAt: auditLogsTable.createdAt,
      userId: auditLogsTable.userId,
      userFullName: usersTable.fullName,
      userUsername: usersTable.username,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(500);

  res.json(logs);
});

router.get("/audit-logs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [log] = await db
    .select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      tableName: auditLogsTable.tableName,
      recordId: auditLogsTable.recordId,
      description: auditLogsTable.description,
      oldData: auditLogsTable.oldData,
      newData: auditLogsTable.newData,
      createdAt: auditLogsTable.createdAt,
      userId: auditLogsTable.userId,
      userFullName: usersTable.fullName,
      userUsername: usersTable.username,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .where(eq(auditLogsTable.id, id));

  if (!log) { res.status(404).json({ error: "Záznam nenalezen" }); return; }
  res.json(log);
});

export default router;
