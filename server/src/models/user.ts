
// server/src/models/user.ts
import mongoose from "mongoose";

export const SERVICES = ["netflix","hulu","max","prime","disney","peacock"] as const;
export type Service = typeof SERVICES[number];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    services: [{ type: String, enum: SERVICES, default: [] }],
    avatarUrl: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },

    // Lockout + suspension
    isSuspended: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.isModified("email") && typeof this.get("email") === "string") {
    this.set("email", this.get("email").trim().toLowerCase());
  }
  next();
});

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

export default mongoose.model("User", userSchema);
