
// server/src/lib/jwt.ts
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-secret-change-me";

export type JwtPayload = { sub: string; ver: number; iat: number; exp: number };

// Sign a JWT with subject (user ID) and token version
export function signToken(sub: string, tokenVersion: number) {
  return jwt.sign({ sub, ver: tokenVersion }, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      const e = new Error("token_expired");
      (e as any).code = "TOKEN_EXPIRED";
      throw e;
    }
    throw err;
  }
}