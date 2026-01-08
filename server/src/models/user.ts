// server/src/models/user.ts
import mongoose, { Schema, InferSchemaType } from "mongoose";
import crypto from "crypto";

export const SERVICES = ["netflix","hulu","max","prime","disney","peacock"] as const;
export type Service = typeof SERVICES[number];

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

function sanitizeUsername(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "");
  return cleaned.slice(0, MAX_USERNAME_LENGTH);
}

function fallbackUsernameSource(doc: any): string {
  if (doc.username) return doc.username;
  if (doc.name) return doc.name;
  if (doc.email && typeof doc.email === "string" && doc.email.includes("@")) {
    return doc.email.split("@")[0];
  }
  return `user${Date.now().toString(36)}`;
}

async function generateUniqueUsername(model: mongoose.Model<any>, baseInput: string): Promise<string> {
  const base = sanitizeUsername(baseInput) || "user";
  let candidate = base.length >= MIN_USERNAME_LENGTH ? base : `${base}${crypto.randomBytes(2).toString("hex")}`;
  candidate = candidate.slice(0, MAX_USERNAME_LENGTH) || "user";

  let counter = 1;
  while (await model.exists({ username: candidate })) {
    const suffix = counter <= 100 ? counter.toString() : crypto.randomBytes(2).toString("hex");
    counter += 1;
    const prefix = candidate.slice(0, Math.max(MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH - suffix.length));
    candidate = `${prefix}${suffix}`.slice(0, MAX_USERNAME_LENGTH);
  }
  return candidate;
}

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    // Display username (preserves casing)
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: MIN_USERNAME_LENGTH,
      maxlength: MAX_USERNAME_LENGTH,
      match: USERNAME_PATTERN,
    },
    // Normalized username (lowercase, for uniqueness)
    usernameNormalized: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: MIN_USERNAME_LENGTH,
      maxlength: MAX_USERNAME_LENGTH,
    },
    services: [{ type: String, enum: SERVICES, default: [] }],
    avatarUrl: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    // Public circles to showcase on profile (only public circles can be shown)
    publicCircleShowcaseIds: [{ type: Schema.Types.ObjectId, ref: "Circle", default: [] }],

    // Lockout + suspension
    isSuspended: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    tokenVersion: { type: Number, default: 0 },

    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.isModified("email") && typeof this.get("email") === "string") {
    this.set("email", this.get("email").trim().toLowerCase());
  }

  // Auto-set usernameNormalized when username changes
  if (this.isModified("username") && typeof this.get("username") === "string") {
    this.set("usernameNormalized", this.get("username").trim().toLowerCase());
  }

  next();
});

userSchema.pre("validate", async function (next) {
  try {
    // Only auto-generate username for new users, not for updates
    if (!this.isNew) {
      return next();
    }

    const model = this.constructor as mongoose.Model<any>;
    let username = sanitizeUsername((this as any).username);
    if (!username || username.length < MIN_USERNAME_LENGTH) {
      const base = fallbackUsernameSource(this);
      username = await generateUniqueUsername(model, base);
    }
    (this as any).username = username;
    next();
  } catch (err) {
    next(err as Error);
  }
});

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

const User = mongoose.model("User", userSchema);

async function backfillMissingUsernames() {
  try {
    const docs = await User.find({
      $or: [{ username: { $exists: false } }, { username: null }, { username: "" }],
    }).select("name email username");

    for (const doc of docs) {
      (doc as any).username = undefined;
      await doc.save();
    }
  } catch (err) {
    console.error("Failed to backfill usernames:", err);
  }
}

if (process.env.BFFLIX_SKIP_USERNAME_BACKFILL !== "true") {
  setImmediate(() => {
    backfillMissingUsernames().catch((err) => console.error("Username backfill error:", err));
  });
}

export type UserDoc = InferSchemaType<typeof userSchema>;
export default User;
