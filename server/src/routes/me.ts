
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import User, { SERVICES, Service } from "../models/user";
import StreamingService from "../models/StreamingService";
import UserStreamingService from "../models/UserStreamingService";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const r = Router();

r.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.id).select("-passwordHash").lean();
  res.json(user);
});

const avatarDataUrlPattern =
  /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=]+$/i;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/i, "Username can only contain letters, numbers, dots, dashes, and underscores")
    .transform((val) => val.toLowerCase())
    .optional(),
  avatarUrl: z
    .union([
      //custom pfp pics lets freaking go
      z.string().url(),
      z.literal(""),
      z
        .string()
        .regex(avatarDataUrlPattern, "Avatar must be a PNG/JPEG/GIF/WEBP/BMP image"),
    ])
    .optional(),
  services: z
    .array(z.enum(SERVICES as unknown as [Service, ...Service[]]))
    .optional(),
});

type ServiceMeta = {
  tmdbProviderId: number;
  name: string;
  displayPriority: number;
};

const SERVICE_META: Record<Service, ServiceMeta> = {
  netflix: { tmdbProviderId: 8, name: "Netflix", displayPriority: 10 },
  hulu: { tmdbProviderId: 15, name: "Hulu", displayPriority: 9 },
  max: { tmdbProviderId: 384, name: "Max", displayPriority: 8 },
  prime: { tmdbProviderId: 9, name: "Amazon Prime Video", displayPriority: 7 },
  disney: { tmdbProviderId: 337, name: "Disney Plus", displayPriority: 6 },
  peacock: { tmdbProviderId: 387, name: "Peacock", displayPriority: 5 },
};

async function syncUserStreamingServices(userId: string, services: Service[]) {
  const uniqueServices = Array.from(new Set(services));

  if (uniqueServices.length === 0) {
    await UserStreamingService.deleteMany({ userId });
    return;
  }

  const docs = await Promise.all(
    uniqueServices.map(async (service) => {
      const meta = SERVICE_META[service];
      if (!meta) return null;

      const doc = await StreamingService.findOneAndUpdate(
        { tmdbProviderId: meta.tmdbProviderId },
        {
          $set: {
            name: meta.name,
            displayPriority: meta.displayPriority,
          },
          $setOnInsert: {
            tmdbProviderId: meta.tmdbProviderId,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      return doc ? doc._id : null;
    })
  );

  const serviceIds = docs.filter((id): id is Types.ObjectId => Boolean(id));

  if (serviceIds.length === 0) {
    await UserStreamingService.deleteMany({ userId });
    return;
  }

  await UserStreamingService.deleteMany({
    userId,
    streamingServiceId: { $nin: serviceIds },
  });

  await Promise.all(
    serviceIds.map((streamingServiceId) =>
      UserStreamingService.updateOne(
        { userId, streamingServiceId },
        { $setOnInsert: { userId, streamingServiceId } },
        { upsert: true }
      )
    )
  );
}

r.patch("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const updateData = { ...parsed.data } as any;
  if (Object.prototype.hasOwnProperty.call(updateData, "username") && !updateData.username) {
    delete updateData.username;
  }
  if (Object.prototype.hasOwnProperty.call(updateData, "avatarUrl")) {
    if (!updateData.avatarUrl) {
      updateData.avatarUrl = "";
    }
  }

  let updated;
  try {
    updated = await User.findByIdAndUpdate(
      req.user!.id,
      updateData,
      { new: true, runValidators: true, select: "-passwordHash" }
    ).lean();
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.username) {
      return res.status(409).json({ error: "username_already_in_use" });
    }
    throw err;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "services")) {
    await syncUserStreamingServices(req.user!.id, Array.isArray(updateData.services) ? updateData.services : []);
  }

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
