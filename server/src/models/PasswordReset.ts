
// server/src/models/PasswordReset.ts
import { Schema, model, InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }, // TTL defined below (single place)
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL: expire exactly at expiresAt (define this ONLY once in your codebase)
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Speed up: invalidate unused tokens per user quickly
schema.index({ userId: 1, usedAt: 1 });

export type PasswordResetDoc = InferSchemaType<typeof schema>;
export default model("PasswordReset", schema);
