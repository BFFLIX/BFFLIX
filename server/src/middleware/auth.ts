
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import User from "../models/user";

export interface AuthedRequest extends Request {
  user?: { id: string; isAdmin?: boolean };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.headers.authorization || "";

    // Only accept Authorization: Bearer <token>
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing_token" });
    }
    const token = auth.slice(7).trim();
    if (!token) return res.status(401).json({ error: "missing_token" });

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch (e: any) {
      if (e?.code === "TOKEN_EXPIRED") {
        return res.status(401).json({ error: "token_expired" });
      }
      return res.status(401).json({ error: "invalid_token" });
    }

    const user = await User.findById(payload.sub).select("_id isAdmin").lean();
    if (!user) {
      // User no longer exists: treat as unauthorized
      return res.status(401).json({ error: "unauthorized" });
    }

    req.user = { id: String(user._id), isAdmin: !!user.isAdmin };
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}