
// server/src/middleware/requireDbReady.ts
import { Request, Response, NextFunction } from "express";
import { isDbReady } from "../db";

export function requireDbReady(req: Request, res: Response, next: NextFunction) {
  if (isDbReady()) return next();
  return res.status(503).json({ error: "service_unavailable", details: "database_unreachable" });
}