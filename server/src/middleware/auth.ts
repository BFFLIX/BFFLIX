
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JwtPayload } from "../lib/jwt";
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
    let token: string | null = null;

    // 1) Prefer Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    // 2) Fallback to cookie "token"
    if (!token && (req as any).cookies?.token) {
      token = (req as any).cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: "missing_token" });
    }

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (e: any) {
      if (e?.code === "TOKEN_EXPIRED") {
        return res.status(401).json({ error: "token_expired" });
      }
      if (e?.code === "WRONG_TOKEN_TYPE") {
        return res.status(401).json({ error: "invalid_token" });
      }
      return res.status(401).json({ error: "invalid_token" });
    }

    const user = await User.findById(payload.sub).select("_id isAdmin").lean();
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }

    req.user = { id: String((user as any)._id), isAdmin: !!(user as any).isAdmin };
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}