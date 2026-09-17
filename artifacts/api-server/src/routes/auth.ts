import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Uživatelské jméno a heslo jsou povinné" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Neplatné přihlašovací údaje" });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: "Neplatné přihlašovací údaje" });
    return;
  }

  const session = (req as unknown as { session: Record<string, unknown> }).session;
  session.userId = user.id;
  session.userRole = user.role;

  res.json({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      workerId: user.workerId,
      contractorCompanyId: user.contractorCompanyId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    message: "Přihlášení úspěšné",
  });
});

router.post("/auth/logout", (req, res): void => {
  const sessionReq = req as unknown as { session: { destroy: (cb: (err: unknown) => void) => void } };
  sessionReq.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Session destroy error");
      res.status(500).json({ error: "Chyba při odhlašování" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Odhlášení úspěšné" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number } }).session;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Nepřihlášen" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    workerId: user.workerId,
    contractorCompanyId: user.contractorCompanyId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

export default router;
