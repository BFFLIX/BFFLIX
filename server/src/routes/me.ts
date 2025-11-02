
import { Router } from "express";
import { z } from "zod";
import User, { SERVICES, Service } from "../models/user";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";

const r = Router();

r.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.id).select("-passwordHash").lean();
  res.json(user);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  services: z.array(z.enum(SERVICES as unknown as [Service, ...Service[]])).optional(),
});

r.patch("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const updated = await User.findByIdAndUpdate(
    req.user!.id,
    parsed.data,
    { new: true, runValidators: true, select: "-passwordHash" }
  ).lean();

  res.json(updated);
});

export default r;

// ---------- Change password ----------
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[0-9]/, "Must include a number"),
});

r.post("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { currentPassword, newPassword } = parsed.data;

  // Fetch user with passwordHash and lock fields
  const user = await User.findById(req.user!.id).select(
    "+passwordHash failedLoginCount lockUntil"
  );
  if (!user) return res.status(404).json({ error: "user_not_found" });

  // Verify current password
  const ok = await bcrypt.compare(currentPassword, (user as any).passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_current_password" });

  // Prevent reusing the same password
  const sameAsOld = await bcrypt.compare(newPassword, (user as any).passwordHash);
  if (sameAsOld) {
    return res.status(400).json({ error: "password_reuse_not_allowed" });
  }

  // Hash and save new password
  (user as any).passwordHash = await bcrypt.hash(newPassword, 10);

  // Clear any lockout status so user isn't stuck after change
  (user as any).failedLoginCount = 0;
  (user as any).lockUntil = null;

  await user.save();


  return res.json({ ok: true });
});