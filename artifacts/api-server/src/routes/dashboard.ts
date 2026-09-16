import { Router } from "express";
import { db, fellingRecordsTable, mowingRecordsTable, workersTable, usersTable, regionsTable } from "@workspace/db";
import { isNull, count, sum, and, gte, lte, eq } from "drizzle-orm";
import { requireOperationsAccess } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/stats", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;

  const fellingWhere = session.userRole === "admin"
    ? isNull(fellingRecordsTable.deletedAt)
    : and(isNull(fellingRecordsTable.deletedAt), eq(fellingRecordsTable.userId, session.userId));

  const mowingWhere = session.userRole === "admin"
    ? isNull(mowingRecordsTable.deletedAt)
    : and(isNull(mowingRecordsTable.deletedAt), eq(mowingRecordsTable.userId, session.userId));

  const [fellingStats] = await db
    .select({ total: count(), mthSum: sum(fellingRecordsTable.mth) })
    .from(fellingRecordsTable)
    .where(fellingWhere);

  const [mowingStats] = await db
    .select({ total: count(), mthSum: sum(mowingRecordsTable.mthTotal) })
    .from(mowingRecordsTable)
    .where(mowingWhere);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [fellingMonth] = await db
    .select({ total: count() })
    .from(fellingRecordsTable)
    .where(and(fellingWhere, gte(fellingRecordsTable.date, firstOfMonth), lte(fellingRecordsTable.date, lastOfMonth)));

  const [mowingMonth] = await db
    .select({ total: count() })
    .from(mowingRecordsTable)
    .where(and(mowingWhere, gte(mowingRecordsTable.date, firstOfMonth), lte(mowingRecordsTable.date, lastOfMonth)));

  const [activeWorkers] = await db
    .select({ total: count() })
    .from(workersTable)
    .where(and(eq(workersTable.isActive, true), isNull(workersTable.deletedAt)));

  const [totalUsers] = await db
    .select({ total: count() })
    .from(usersTable)
    .where(isNull(usersTable.deletedAt));

  res.json({
    totalFellingRecords: fellingStats?.total ?? 0,
    totalMowingRecords: mowingStats?.total ?? 0,
    totalFellingMth: parseFloat(fellingStats?.mthSum ?? "0"),
    totalMowingMth: parseFloat(mowingStats?.mthSum ?? "0"),
    recordsThisMonth: (fellingMonth?.total ?? 0) + (mowingMonth?.total ?? 0),
    activeWorkers: activeWorkers?.total ?? 0,
    totalUsers: totalUsers?.total ?? 0,
  });
});

router.get("/dashboard/recent-records", requireOperationsAccess, async (req, res): Promise<void> => {
  const session = (req as unknown as { session: { userId: number; userRole: string } }).session;

  const fellingWhere = session.userRole === "admin"
    ? isNull(fellingRecordsTable.deletedAt)
    : and(isNull(fellingRecordsTable.deletedAt), eq(fellingRecordsTable.userId, session.userId));

  const mowingWhere = session.userRole === "admin"
    ? isNull(mowingRecordsTable.deletedAt)
    : and(isNull(mowingRecordsTable.deletedAt), eq(mowingRecordsTable.userId, session.userId));

  const fellingRows = await db
    .select({
      id: fellingRecordsTable.id,
      date: fellingRecordsTable.date,
      regionId: fellingRecordsTable.regionId,
      userId: fellingRecordsTable.userId,
      createdAt: fellingRecordsTable.createdAt,
      mth: fellingRecordsTable.mth,
    })
    .from(fellingRecordsTable)
    .where(fellingWhere)
    .orderBy(fellingRecordsTable.createdAt)
    .limit(10);

  const mowingRows = await db
    .select({
      id: mowingRecordsTable.id,
      date: mowingRecordsTable.date,
      regionId: mowingRecordsTable.regionId,
      userId: mowingRecordsTable.userId,
      createdAt: mowingRecordsTable.createdAt,
      mthTotal: mowingRecordsTable.mthTotal,
    })
    .from(mowingRecordsTable)
    .where(mowingWhere)
    .orderBy(mowingRecordsTable.createdAt)
    .limit(10);

  const allRegionIds = [...new Set([...fellingRows.map((r) => r.regionId), ...mowingRows.map((r) => r.regionId)])];
  const allUserIds = [...new Set([...fellingRows.map((r) => r.userId), ...mowingRows.map((r) => r.userId)])];

  const regions: Record<number, string> = {};
  const users: Record<number, string> = {};

  for (const rid of allRegionIds) {
    const [r] = await db.select({ name: regionsTable.name }).from(regionsTable).where(eq(regionsTable.id, rid));
    if (r) regions[rid] = r.name;
  }
  for (const uid of allUserIds) {
    const [u] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, uid));
    if (u) users[uid] = u.fullName;
  }

  const combined = [
    ...fellingRows.map((r) => ({
      id: r.id,
      type: "kaceni" as const,
      date: r.date,
      regionName: regions[r.regionId] ?? "",
      userFullName: users[r.userId] ?? "",
      createdAt: r.createdAt.toISOString(),
      mth: r.mth ? parseFloat(r.mth) : null,
    })),
    ...mowingRows.map((r) => ({
      id: r.id,
      type: "seceni" as const,
      date: r.date,
      regionName: regions[r.regionId] ?? "",
      userFullName: users[r.userId] ?? "",
      createdAt: r.createdAt.toISOString(),
      mth: r.mthTotal ? parseFloat(r.mthTotal) : null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json({ records: combined });
});

export default router;
