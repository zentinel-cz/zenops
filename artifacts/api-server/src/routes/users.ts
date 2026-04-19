import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

const userFields = {
  id: usersTable.id,
  username: usersTable.username,
  fullName: usersTable.fullName,
  role: usersTable.role,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select(userFields)
    .from(usersTable)
    .where(isNull(usersTable.deletedAt))
    .orderBy(usersTable.fullName);
  res.json(users);
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const { username, password, fullName, role } = req.body as {
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
  };

  if (!username || !password || !fullName || !role) {
    res.status(400).json({ error: "Všechna pole jsou povinná" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, fullName, role: role as "admin" | "user" })
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    });

  await logAudit({
    userId: session.userId,
    action: "create",
    tableName: "users",
    recordId: user.id,
    description: `Vytvořen uživatel ${user.fullName} (${user.username}), role: ${user.role}`,
    newData: { username: user.username, fullName: user.fullName, role: user.role },
  });

  res.status(201).json(user);
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [user] = await db
    .select(userFields)
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Uživatel nenalezen" });
    return;
  }

  res.json(user);
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fullName, role, isActive, password } = req.body as {
    fullName?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  };

  const [before] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, id)).limit(1);

  const updates: Record<string, unknown> = {};
  if (fullName != null) updates.fullName = fullName;
  if (role != null) updates.role = role;
  if (isActive != null) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Žádná data k aktualizaci" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    });

  if (!user) {
    res.status(404).json({ error: "Uživatel nenalezen" });
    return;
  }

  const changedFields = Object.keys(updates).filter((k) => k !== "passwordHash");
  const description = changedFields.length
    ? `Upraven uživatel ${user.fullName}: ${changedFields.join(", ")}${password ? ", heslo" : ""}`
    : `Upraven uživatel ${user.fullName}: heslo`;

  await logAudit({
    userId: session.userId,
    action: "update",
    tableName: "users",
    recordId: user.id,
    description,
    oldData: before ? { fullName: before.fullName, role: before.role, isActive: before.isActive } : null,
    newData: { fullName: user.fullName, role: user.role, isActive: user.isActive },
  });

  res.json(user);
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [before] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, id)).limit(1);

  const [user] = await db
    .update(usersTable)
    .set({ deletedAt: new Date(), deletedBy: session.userId })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id });

  if (!user) {
    res.status(404).json({ error: "Uživatel nenalezen" });
    return;
  }

  await logAudit({
    userId: session.userId,
    action: "delete",
    tableName: "users",
    recordId: id,
    description: `Smazán uživatel ${before?.fullName ?? id} (${before?.username ?? ""})`,
    oldData: before ? { fullName: before.fullName, username: before.username, role: before.role } : null,
  });

  res.json({ message: "Uživatel smazán" });
});

export default router;
