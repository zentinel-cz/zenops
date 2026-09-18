import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = (req as unknown as { session: { userId?: number; userRole?: string } }).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Nepřihlášen" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = (req as unknown as { session: { userId?: number; userRole?: string } }).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Nepřihlášen" });
    return;
  }
  if (session.userRole !== "admin") {
    res.status(403).json({ error: "Nedostatečná oprávnění" });
    return;
  }
  next();
}

export function requireOperationsAccess(req: Request, res: Response, next: NextFunction): void {
  const session = (req as unknown as { session: { userId?: number; userRole?: string } }).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Nepřihlášen" });
    return;
  }
  if (session.userRole !== "admin") {
    res.status(403).json({ error: "Tato část aplikace pro vaši roli zatím není zpřístupněna" });
    return;
  }
  next();
}
