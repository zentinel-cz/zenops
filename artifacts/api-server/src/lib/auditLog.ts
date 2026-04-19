import { db, auditLogsTable } from "@workspace/db";

interface AuditLogEntry {
  userId: number;
  action: "create" | "update" | "delete";
  tableName: string;
  recordId?: number | null;
  description: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: entry.userId,
      action: entry.action,
      tableName: entry.tableName,
      recordId: entry.recordId ?? null,
      description: entry.description,
      oldData: entry.oldData ?? null,
      newData: entry.newData ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
