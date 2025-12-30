
// server/src/lib/jwt.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

// Separate secrets so a leaked access token secret does not automatically compromise refresh tokens.
// In production, set BOTH env vars.
const accessSecret: Secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev-access-secret-change-me";
const refreshSecret: Secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "dev-refresh-secret-change-me";

export type JwtTokenType = "access" | "refresh";

export type JwtPayload = {
  sub: string; // user id
  ver: number; // tokenVersion
  typ: JwtTokenType; // token type
  iat: number;
  exp: number;
};

// Defaults are safe for dev. In prod, tune to your needs.
export const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// Backward compatible: old callers get a long-lived token. Treat as an access token.
export function signToken(sub: string, tokenVersion: number) {
  return signAccessToken(sub, tokenVersion, { expiresIn: "7d" });
}

export function signAccessToken(
  sub: string,
  tokenVersion: number,
  opts?: { expiresIn?: string }
) {
  const options: SignOptions = {
    // Some jsonwebtoken typings use `StringValue | number` for expiresIn; cast is safe here.
    expiresIn: (opts?.expiresIn || ACCESS_TOKEN_EXPIRES_IN) as any,
  };
  return jwt.sign({ sub, ver: tokenVersion, typ: "access" }, accessSecret, options);
}

export function signRefreshToken(
  sub: string,
  tokenVersion: number,
  opts?: { expiresIn?: string }
) {
  const options: SignOptions = {
    expiresIn: (opts?.expiresIn || REFRESH_TOKEN_EXPIRES_IN) as any,
  };
  return jwt.sign({ sub, ver: tokenVersion, typ: "refresh" }, refreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return verify(token, accessSecret, "access");
}

export function verifyRefreshToken(token: string): JwtPayload {
  return verify(token, refreshSecret, "refresh");
}

// Generic verifier. Checks exp and typ.
function verify(token: string, secret: Secret, expectedType: JwtTokenType): JwtPayload {
  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (payload.typ !== expectedType) {
      const e = new Error("wrong_token_type");
      (e as any).code = "WRONG_TOKEN_TYPE";
      throw e;
    }
    return payload;
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      const e = new Error("token_expired");
      (e as any).code = "TOKEN_EXPIRED";
      throw e;
    }
    throw err;
  }
}

// Legacy verifier for older code paths.
// Treats the token as an access token.
export function verifyToken(token: string): JwtPayload {
  return verifyAccessToken(token);
}