import { Router } from "express";
import { db, accessoriesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

router.get("/accessories", requireAdmin, async (_req, res): Promise<void> => {
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
    name?: string; type?: string; serialNumber?: string; note?: string; isActive?: boolean;
  };

  if (!name) { res.status(400).json({ error: "Název je povinný" }); return; }

  const [item] = await db
    .insert(accessoriesTable)
    .values({ name, type, serialNumber, note, isActive: isActive ?? true })
    .returning();

  await logAudit({
    userId: session.userId, action: "create", tableName: "accessories", recordId: item.id,
    description: `Vytvořeno příslušenství ${item.name}${item.type ? ` (${item.type})` : ""}`,
    newData: { name: item.name, type: item.type, serialNumber: item.serialNumber },
  });

  res.status(201).json(item);
});

router.patch("/accessories/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Neplatné ID" }); return; }

  const [existing] = await db.select().from(accessoriesTable).where(eq(accessoriesTable.id, id)).limit(1);
  if (!existing || existing.deletedAt) { res.status(404).json({ error: "Příslušenství nenalezeno" }); return; }

  const { name, type, serialNumber, note, isActive } = req.body as {
    name?: string; type?: string; serialNumber?: string; note?: string; isActive?: boolean;
  };

  const [updated] = await db
    .update(accessoriesTable)
    .set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(serialNumber !== undefined && { serialNumber }),
      ...(note !== undefined && { note }),
      ...(isActive !== undefined && { isActive }),
    })
    .where(eq(accessoriesTable.id, id))
    .returning();

  await logAudit({
    userId: session.userId, action: "update", tableName: "accessories", recordId: id,
    description: `Upraveno příslušenství ${updated.name}`,
    oldData: existing as Record<string, unknown>, newData: updated as Record<string, unknown>,
  });

  res.json(updated);
});

router.delete("/accessories/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Neplatné ID" }); return; }

  const [existing] = await db.select().from(accessoriesTable).where(eq(accessoriesTable.id, id)).limit(1);
  if (!existing || existing.deletedAt) { res.status(404).json({ error: "Příslušenství nenalezeno" }); return; }

  await db.update(accessoriesTable).set({ deletedAt: new Date() }).where(eq(accessoriesTable.id, id));

  await logAudit({
    userId: session.userId, action: "delete", tableName: "accessories", recordId: id,
    description: `Smazáno příslušenství ${existing.name}`,
    oldData: existing as Record<string, unknown>,
  });

  res.json({ message: "Příslušenství smazáno" });
});

export default router;
