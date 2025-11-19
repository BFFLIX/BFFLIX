// server/src/routes/auth.ts
import { Router } from "express";
import type { CookieOptions } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import User from "../models/user";
import PasswordReset from "../models/PasswordReset";
import { signToken } from "../lib/jwt";
import { generateToken, hashToken } from "../lib/resetToken";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../lib/mailer";
import { validatePassword } from "../lib/password";

const r = Router();

function normEmail(e: string) {
  return e.trim().toLowerCase();
}

const isProd = process.env.NODE_ENV === "production";

const tokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax" | "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ---------- Schemas ----------
const signupSchema = z.object({
  email: z.string().email().transform(normEmail),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
  name: z.string().trim().min(1).max(50),
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

// ---------- Signup ----------
r.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password, name } = parsed.data;

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
    const user = await User.create({ email, name: name.trim(), passwordHash });

    const token = signToken(String(user._id), (user as any).tokenVersion ?? 0);

    // Fire-and-forget welcome email (does not block signup)
    sendWelcomeEmail(user.email, user.name).catch((e) =>
      console.error("Welcome email failed:", e)
    );

    return res
      .cookie("token", token, tokenCookieOptions)
      .status(201)
      .json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "email_already_in_use" });
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

    // On success: clear counters and lock
    if ((user as any).failedLoginCount || (user as any).lockUntil) {
      (user as any).failedLoginCount = 0;
      (user as any).lockUntil = null;
      await user.save();
    }

    const token = signToken(String(user._id), (user as any).tokenVersion ?? 0);

    return res
      .cookie("token", token, tokenCookieOptions)
      .json({
        token,
        user: { id: user._id, email: user.email, name: user.name },
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

export default r;