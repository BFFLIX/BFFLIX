
// server/src/models/EmailVerification.ts
import { Schema, model, InferSchemaType } from "mongoose";

const schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ userId: 1, usedAt: 1 });
schema.index({ codeHash: 1 });

export type EmailVerificationDoc = InferSchemaType<typeof schema>;
export default model("EmailVerification", schema);