import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, workersTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/auditLog";

const router = Router();

const userFields = {
  id: usersTable.id,
  username: usersTable.username,
  fullName: usersTable.fullName,
  role: usersTable.role,
  workerId: usersTable.workerId,
  isActive: usersTable.isActive,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fullName.trim(),
    lastName: parts.slice(1).join(" ") || "—",
  };
}

function roleDisplayName(role: string): string {
  return role === "employee" ? "Pracovník" : role === "manager" ? "Vedoucí" : role === "admin" ? "Admin" : "Uživatel";
}

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
  const { username, password, fullName, role, workerId } = req.body as {
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
    workerId?: number | null;
  };

  if (!username || !password || !fullName || !role) {
    res.status(400).json({ error: "Všechna pole jsou povinná" });
    return;
  }
  if (!["admin", "user", "employee", "manager"].includes(role)) { res.status(400).json({ error: "Neplatná role" }); return; }
  if (workerId) {
    const [worker] = await db.select({ id: workersTable.id }).from(workersTable).where(and(eq(workersTable.id, workerId), eq(workersTable.isActive, true), isNull(workersTable.deletedAt)));
    if (!worker) { res.status(400).json({ error: "Pracovní profil neexistuje nebo není aktivní" }); return; }
    const [linked] = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.workerId, workerId), isNull(usersTable.deletedAt)));
    if (linked) { res.status(409).json({ error: "Tento pracovník již má uživatelský účet" }); return; }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.transaction(async (tx) => {
    let linkedWorkerId = workerId ?? null;
    if (["employee", "manager"].includes(role) && !linkedWorkerId) {
      const workerName = splitFullName(fullName);
      const [worker] = await tx
        .insert(workersTable)
        .values({ ...workerName, isActive: true })
        .returning({ id: workersTable.id });
      linkedWorkerId = worker.id;
    }

    const [created] = await tx
      .insert(usersTable)
      .values({ username, passwordHash, fullName: fullName.trim(), role: role as "admin" | "user" | "employee" | "manager", workerId: linkedWorkerId })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        role: usersTable.role,
        workerId: usersTable.workerId,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
    return created;
  });

  await logAudit({
    userId: session.userId,
    action: "create",
    tableName: "users",
    recordId: user.id,
    description: `Vytvořen uživatel ${user.fullName} (${user.username}), role: ${roleDisplayName(user.role)}`,
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
  const { fullName, role, isActive, password, workerId } = req.body as {
    fullName?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
    workerId?: number | null;
  };

  const [before] = await db.select(userFields).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!before) { res.status(404).json({ error: "Uživatel nenalezen" }); return; }

  const nextRole = role ?? before.role;
  const nextWorkerId = workerId !== undefined ? workerId : before.workerId;
  const updates: Record<string, unknown> = {};
  if (fullName != null) updates.fullName = fullName;
  if (role != null) updates.role = role;
  if (role != null && !["admin", "user", "employee", "manager"].includes(role)) { res.status(400).json({ error: "Neplatná role" }); return; }
  if (workerId !== undefined) {
    if (workerId != null) {
      const [linked] = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.workerId, workerId), isNull(usersTable.deletedAt)));
      if (linked && linked.id !== id) { res.status(409).json({ error: "Tento pracovník již má uživatelský účet" }); return; }
    }
    updates.workerId = workerId;
  }
  if (isActive != null) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Žádná data k aktualizaci" });
    return;
  }

  const user = await db.transaction(async (tx) => {
    let linkedWorkerId = nextWorkerId;
    if (["employee", "manager"].includes(nextRole) && !linkedWorkerId) {
      const workerName = splitFullName(fullName ?? before.fullName);
      const [worker] = await tx.insert(workersTable).values({ ...workerName, isActive: isActive ?? before.isActive }).returning({ id: workersTable.id });
      linkedWorkerId = worker.id;
      updates.workerId = linkedWorkerId;
    }

    if (linkedWorkerId && ["employee", "manager"].includes(nextRole)) {
      const workerUpdates: Record<string, unknown> = {};
      if (fullName != null) Object.assign(workerUpdates, splitFullName(fullName));
      if (isActive != null) workerUpdates.isActive = isActive;
      if (Object.keys(workerUpdates).length) await tx.update(workersTable).set(workerUpdates).where(eq(workersTable.id, linkedWorkerId));
    }

    const [updated] = await tx
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        fullName: usersTable.fullName,
        role: usersTable.role,
        workerId: usersTable.workerId,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
    return updated;
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

  if (before?.workerId) {
    await db.update(workersTable).set({ isActive: false }).where(eq(workersTable.id, before.workerId));
  }

  const [user] = await db
    .update(usersTable)
    .set({ deletedAt: new Date(), deletedBy: session.userId, workerId: null, isActive: false })
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
