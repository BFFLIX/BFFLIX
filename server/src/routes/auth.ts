
// server/src/routes/auth.ts
import { Router } from "express";
import type { CookieOptions } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import User from "../models/user";
import PasswordReset from "../models/PasswordReset";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { generateToken, hashToken } from "../lib/resetToken";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer";
import { validatePassword } from "../lib/password";
import crypto from "crypto";
import EmailVerification from "../models/EmailVerification";
import mongoose from "mongoose";

// Refresh token storage (hash only) so we can revoke per-device tokens.
// Note: kept inline to avoid creating new files right now; we can move it into /models later.
type RefreshTokenDoc = {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replacedByTokenHash?: string | null;
};

const RefreshTokenSchema = new mongoose.Schema<RefreshTokenDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL cleanup for old tokens (Mongo will delete after expiresAt)
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken =
  (mongoose.models.RefreshToken as mongoose.Model<RefreshTokenDoc>) ||
  mongoose.model<RefreshTokenDoc>("RefreshToken", RefreshTokenSchema);

function hashRefreshToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const r = Router();

function normEmail(e: string) {
  return e.trim().toLowerCase();
}


const isProd = process.env.NODE_ENV === "production";

// Public URL base used in emails/deep links.
// Prefer explicit env vars; otherwise fall back to the main web host.
const WEB_BASE_URL = (process.env.APP_BASE_URL || "https://bfflix.com").replace(/\/$/, "");
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || WEB_BASE_URL).replace(/\/$/, "");

// Where to send users after clicking the email verify link.
// Default to the web root to avoid 404s on deep-linked SPA routes.
const VERIFY_REDIRECT_BASE = (process.env.VERIFY_REDIRECT_URL || WEB_BASE_URL).replace(/\/$/, "");

function buildVerifyRedirectUrl(success: boolean) {
  return `${VERIFY_REDIRECT_BASE}/?verified=${success ? 1 : 0}`;
}

function buildVerifyLink(token: string) {
  // This link hits the backend directly, verifies the token, then redirects to the web login (or can be handled by the app).
  return `${PUBLIC_BASE_URL}/auth/verify/${token}`;
}

const tokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ---------- Schemas ----------
const USERNAME_REGEX = /^[a-z0-9._-]+$/i;

const signupSchema = z.object({
  email: z.string().email().transform(normEmail),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
  name: z.string().trim().min(1).max(50),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(USERNAME_REGEX, "Only letters, numbers, dots, dashes, and underscores are allowed")
    .transform((val) => val.toLowerCase())
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform(normEmail),
  password: z.string().min(1, "Password required"),
});

const requestResetSchema = z.object({
  email: z.string().email().transform(normEmail),
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

const requestVerificationSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email().transform(normEmail),
  name: z.string().trim().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().email().transform(normEmail),
});

const verifyEmailSchema = z.object({
  token: z.string().optional(),
  code: z.string().optional(),
  email: z.string().email().transform(normEmail).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(20).optional(),
  all: z.boolean().optional(),
});

// ---------- Signup ----------
r.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password, name, username } = parsed.data;

  // Enforce strong password (policy + zxcvbn)
  {
    const pwCheck = validatePassword(password, { email, name });
    if (!pwCheck.ok) {
      return res.status(400).json({
        error: "weak_password",
        score: pwCheck.score,
        details: pwCheck.errors,
      });
    }
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "email_already_in_use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      name: name.trim(),
      passwordHash,
      ...(username ? { username } : {}),
    });

    // Fire-and-forget: create verification token + 6 digit code and send welcome + verification email.
    (async () => {
      try {
        // Clean up any previous unused verifications for this user
        await EmailVerification.deleteMany({
          userId: user._id,
          usedAt: null,
        });

        // Token for magic link
        const verifyToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");

        // 6 digit numeric code as a string
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash("sha256").update(code).digest("hex");

        await EmailVerification.create({
          userId: user._id,
          tokenHash,
          codeHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });

        // Always point users to the main production host
        const verifyUrl = buildVerifyLink(verifyToken);

        await sendVerificationEmail(user.email, verifyUrl, code, user.name);
      } catch (e) {
        console.error("Signup verification email failed:", e);
      }
    })();

    return res.status(201).json({ ok: true, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err: any) {
    if (err?.code === 11000) {
      if (err?.keyPattern?.email) {
        return res.status(409).json({ error: "email_already_in_use" });
      }
      if (err?.keyPattern?.username) {
        return res.status(409).json({ error: "username_already_in_use" });
      }
    }
    console.error("Signup error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------- Login (lockout + suspension) ----------
r.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parsed.data;

  const MAX_FAILED = Number(process.env.LOGIN_MAX_FAILED ?? 5);
  const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MIN ?? 60);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const isSuspended = Boolean((user as any).isSuspended);
    if (isSuspended) {
      return res.status(403).json({ error: "account_suspended" });
    }

    const lockUntil: Date | null = (user as any).lockUntil ?? null;
    if (lockUntil && lockUntil.getTime() > Date.now()) {
      return res.status(423).json({
        error: "account_locked",
        unlockAt: lockUntil.toISOString(),
        message: "Too many failed attempts. Try again later or reset your password.",
      });
    }

    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) {
      const nextFailed = ((user as any).failedLoginCount || 0) + 1;

      if (nextFailed >= MAX_FAILED) {
        (user as any).failedLoginCount = 0;
        (user as any).lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      } else {
        (user as any).failedLoginCount = nextFailed;
        (user as any).lockUntil = null;
      }

      await user.save();
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (!(user as any).isVerified) {
      return res.status(403).json({
        error: "email_not_verified",
        userId: user._id,
        email: user.email,
        canResend: true,
      });
    }

    // On success: clear counters and lock
    if ((user as any).failedLoginCount || (user as any).lockUntil) {
      (user as any).failedLoginCount = 0;
      (user as any).lockUntil = null;
      await user.save();
    }

    const tokenVersion = (user as any).tokenVersion ?? 0;

    const accessToken = signAccessToken(String(user._id), tokenVersion);
    const refreshToken = signRefreshToken(String(user._id), tokenVersion);

    // Store refresh token hash so it can be revoked later
    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // keep in sync with JWT_REFRESH_EXPIRES_IN
    });

    // Backward compat for web: keep setting cookie named "token" with the access token
    const token = accessToken;

    return res
      .cookie("token", token, tokenCookieOptions)
      .json({
        token, // legacy
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, name: user.name, username: (user as any).username },
      });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------- Request password reset ----------
r.post("/request-reset", async (req, res) => {
  const parsed = requestResetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email } = parsed.data;

  try {
    const user = await User.findOne({ email }).select("_id email name").lean();
    if (!user) return res.json({ ok: true }); // no enumeration

    await PasswordReset.deleteMany({ userId: user._id, usedAt: { $exists: false } });

    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

    const base = process.env.APP_BASE_URL || "http://localhost:5173";
    const resetUrl = `${base}/reset-password?token=${raw}`;

    // Send templated password reset email via SES
    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
    } catch (e) {
      console.error("Password reset email failed:", e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Request reset error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------- Complete password reset (unlock + bump tokenVersion) ----------
r.post("/reset", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  try {
    const record = await PasswordReset.findOne({ tokenHash });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    const user = await User.findById(record.userId);
    if (!user) return res.status(400).json({ error: "invalid_or_expired_token" });

    // Enforce strong password during reset using user context
    {
      const pwCheck = validatePassword(password, { email: (user as any).email, name: (user as any).name });
      if (!pwCheck.ok) {
        return res.status(400).json({
          error: "weak_password",
          score: pwCheck.score,
          details: pwCheck.errors,
        });
      }
    }

    (user as any).passwordHash = await bcrypt.hash(password, 10);
    (user as any).failedLoginCount = 0;
    (user as any).lockUntil = null;
    (user as any).tokenVersion = ((user as any).tokenVersion ?? 0) + 1;

    await user.save();

    record.usedAt = new Date();
    await record.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------- Request email verification (token + 6 digit code) ----------
r.post("/request-verification", async (req, res) => {
  const parsed = requestVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { userId, email, name } = parsed.data;

    // Clean up any previous unused verifications for this user
    await EmailVerification.deleteMany({
      userId,
      usedAt: null,
    });

    // Token for magic link
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // 6 digit numeric code as a string
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await EmailVerification.create({
      userId,
      tokenHash,
      codeHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Always point users to the main production host
    const verifyUrl = buildVerifyLink(token);

    try {
      // sendVerificationEmail(email, verifyUrl, code, name)
      await sendVerificationEmail(email, verifyUrl, code, name);
    } catch (e) {
      console.error("Verification email failed:", e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Request verification error:", err);
    return res.status(500).json({ error: "could_not_send" });
  }
});

// Resend verification email by email address (safe response to avoid enumeration)
r.post("/resend-verification", async (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email } = parsed.data;

  try {
    const user = await User.findOne({ email }).select("_id email name isVerified");

    // Always return ok to avoid revealing whether an email exists.
    if (!user) return res.json({ ok: true });
    if ((user as any).isVerified) return res.json({ ok: true });

    // Clear any previous unused verifications (expired or not)
    await EmailVerification.deleteMany({
      userId: (user as any)._id,
      usedAt: null,
    });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(verifyToken).digest("hex");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    await EmailVerification.create({
      userId: (user as any)._id,
      tokenHash,
      codeHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const verifyUrl = buildVerifyLink(verifyToken);

    try {
      await sendVerificationEmail((user as any).email, verifyUrl, code, (user as any).name);
    } catch (e) {
      console.error("Resend verification email failed:", e);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Resend verification error:", err);
    // Still return ok to avoid enumeration
    return res.json({ ok: true });
  }
});

r.get("/verify/:token", async (req, res) => {
  const token = String(req.params.token || "");
  if (!token || token.length < 10) {
    return res.status(400).send("Invalid verification link");
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const verification = await EmailVerification.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return res.redirect(buildVerifyRedirectUrl(false));
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      return res.redirect(buildVerifyRedirectUrl(false));
    }

    if (!(user as any).isVerified) {
      (user as any).isVerified = true;
      await user.save();
    }

    verification.usedAt = new Date();
    await verification.save();

    return res.redirect(buildVerifyRedirectUrl(true));
  } catch (err) {
    console.error("Verify link error:", err);
    return res.redirect(buildVerifyRedirectUrl(false));
  }
});

// ---------- Verify email using token or code ----------
r.post("/verify-email", async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { token, code, email } = parsed.data;

  try {
    let verification: any = null;

    if (token) {
      // Case A: magic link
      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      verification = await EmailVerification.findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });
    } else if (code && email) {
      // Case B: 6-digit code + email
      const user = await User.findOne({ email }).select("_id");
      if (!user) {
        return res.status(400).json({ error: "invalid_or_expired_token" });
      }

      const codeHash = crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

      verification = await EmailVerification.findOne({
        userId: user._id,
        codeHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });
    } else {
      return res.status(400).json({ error: "token_or_code_required" });
    }

    if (!verification) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    // If already verified, mark this verification as used and return ok
    if ((user as any).isVerified) {
      verification.usedAt = new Date();
      await verification.save();
      return res.json({ ok: true, alreadyVerified: true });
    }

    // Mark user as verified
    (user as any).isVerified = true;
    await user.save();

    verification.usedAt = new Date();
    await verification.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("Verify email error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// Public: password strength preview (optional for frontend UX)
const strengthSchema = z.object({
  password: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

r.post("/password-strength", (req, res) => {
  const parsed = strengthSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const { password, email, name } = parsed.data;
  const check = validatePassword(password, { email: email ?? "", name: name ?? "" });
  return res.json({ ok: check.ok, score: check.score, details: check.errors });
});



// ---------- Refresh (rotate refresh token; issue new access token) ----------
r.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Ensure user still exists and tokenVersion matches (logout-all / password reset bumps tokenVersion)
    const user = await User.findById(payload.sub).select("_id email name username tokenVersion");
    if (!user) return res.status(401).json({ error: "invalid_refresh" });

    const tokenVersion = (user as any).tokenVersion ?? 0;
    if (payload.ver !== tokenVersion) {
      return res.status(401).json({ error: "invalid_refresh" });
    }

    const oldHash = hashRefreshToken(refreshToken);

    const existing = await RefreshToken.findOne({
      userId: user._id,
      tokenHash: oldHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!existing) {
      return res.status(401).json({ error: "invalid_refresh" });
    }

    // Rotate: revoke old refresh token and issue a new one
    const newAccessToken = signAccessToken(String(user._id), tokenVersion);
    const newRefreshToken = signRefreshToken(String(user._id), tokenVersion);
    const newHash = hashRefreshToken(newRefreshToken);

    existing.revokedAt = new Date();
    (existing as any).replacedByTokenHash = newHash;
    await existing.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Backward compat cookie: refresh sets a new access token cookie
    res.cookie("token", newAccessToken, tokenCookieOptions);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user._id, email: (user as any).email, name: (user as any).name, username: (user as any).username },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "invalid_refresh" });
  }
});

// ---------- Logout (revoke refresh token or all refresh tokens) ----------
r.post("/logout", async (req, res) => {
  const parsed = logoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { refreshToken, all } = parsed.data;

  try {
    if (all) {
      // If the client sends a refresh token, use it to identify the user; otherwise no-op
      if (refreshToken) {
        try {
          const payload = verifyRefreshToken(refreshToken);
          await RefreshToken.updateMany(
            { userId: payload.sub, revokedAt: null },
            { $set: { revokedAt: new Date() } }
          );
        } catch {
          // ignore
        }
      }

      // Clear cookie for web
      res.clearCookie("token", { path: "/" });
      return res.json({ ok: true });
    }

    if (refreshToken) {
      const h = hashRefreshToken(refreshToken);
      await RefreshToken.updateOne(
        { tokenHash: h, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    // Clear cookie for web
    res.clearCookie("token", { path: "/" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    // Always return ok to avoid leaking token validity
    res.clearCookie("token", { path: "/" });
    return res.json({ ok: true });
  }
});
export default r;
