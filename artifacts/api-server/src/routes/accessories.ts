import { Router } from "express";
import { db, accessoriesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireAdmin, requireOperationsAccess } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";
import { queryString } from "../lib/query";

const router = Router();

router.get("/accessories", requireOperationsAccess, async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(accessoriesTable)
    .where(isNull(accessoriesTable.deletedAt))
    .orderBy(accessoriesTable.name);
  res.json(items);
});

router.post("/accessories", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const { name, type, serialNumber, note, isActive } = req.body as {
    name: string;
    type?: string | null;
    serialNumber?: string | null;
    note?: string | null;
    isActive?: boolean;
  };

  const [created] = await db
    .insert(accessoriesTable)
    .values({
      name,
      type: type ?? null,
      serialNumber: serialNumber ?? null,
      note: note ?? null,
      isActive: typeof isActive === "boolean" ? isActive : true,
    })
    .returning();

  await logAudit({
    userId: session.userId,
    action: "create",
    tableName: "accessories",
    recordId: created.id,
    description: `Vytvořeno příslušenství ${created.name}`,
    newData: created,
  });

  res.status(201).json(created);
});

router.put("/accessories/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);
  const { name, type, serialNumber, note, isActive } = req.body as {
    name: string;
    type?: string | null;
    serialNumber?: string | null;
    note?: string | null;
    isActive?: boolean;
  };

  const [updated] = await db
    .update(accessoriesTable)
    .set({
      name,
      type: type ?? null,
      serialNumber: serialNumber ?? null,
      note: note ?? null,
      isActive: typeof isActive === "boolean" ? isActive : true,
      updatedAt: new Date(),
    })
    .where(eq(accessoriesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Příslušenství nenalezeno" });
    return;
  }

  await logAudit({
    userId: session.userId,
    action: "update",
    tableName: "accessories",
    recordId: updated.id,
    description: `Upraveno příslušenství ${updated.name}`,
    newData: updated,
  });

  res.json(updated);
});

router.delete("/accessories/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const id = parseInt(queryString(req.params.id) ?? "", 10);

  const [deleted] = await db
    .update(accessoriesTable)
    .set({ deletedAt: new Date() })
    .where(eq(accessoriesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Příslušenství nenalezeno" });
    return;
  }

  await logAudit({
    userId: session.userId,
    action: "delete",
    tableName: "accessories",
    recordId: deleted.id,
    description: `Smazáno příslušenství ${deleted.name}`,
    oldData: deleted,
  });

  res.status(204).end();
});

export default router;
