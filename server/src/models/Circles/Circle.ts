
import mongoose, { Schema, Types, InferSchemaType } from "mongoose";

const circleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 240 },

    // NEW: visibility (private by default)
    visibility: { type: String, enum: ["private", "public"], default: "private" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    //NEW: add Moderator field to Circle documentation
    moderators: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // NEW: optional invite code for private circles (null for public)
    inviteCode: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure the creator is included in members
circleSchema.pre("validate", function (next) {
  const doc = this as any;

  // Trim/collapse whitespace defensively
  if (typeof doc.name === "string") {
    doc.name = doc.name.replace(/\s+/g, " ").trim();
  }
  if (typeof doc.description === "string") {
    doc.description = doc.description.replace(/\s+/g, " ").trim();
  }
  if (typeof doc.inviteCode === "string") {
    doc.inviteCode = doc.inviteCode.trim();
    if (doc.inviteCode.length === 0) doc.inviteCode = undefined;
  }

  if (doc.createdBy) {
    if (!Array.isArray(doc.members) || doc.members.length === 0) {
      doc.members = [doc.createdBy];
    } else if (!doc.members.some((m: Types.ObjectId) => m?.equals?.(doc.createdBy))) {
      doc.members.push(doc.createdBy);
    }
  }

  // Deduplicate members
  if (Array.isArray(doc.members)) {
    const seen = new Set<string>();
    doc.members = doc.members.filter((m: Types.ObjectId) => {
      const k = m?.toString?.();
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  next();
});

// Indexes (avoid inline "index: true" to prevent duplicate warnings)
circleSchema.index({ members: 1 });                       // "my circles"
circleSchema.index({ createdBy: 1 });                     // owner queries
circleSchema.index({ visibility: 1, name: 1 });           // discover public circles
circleSchema.index({ inviteCode: 1 }, { sparse: true, unique: true }); // lookup by invite code (optional)
circleSchema.index({ moderators: 1 });                    //Moderator

// Virtual id + toJSON shaping (clients get `id`, not `_id`)
circleSchema.virtual("id").get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});

circleSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc: any, ret: any) {
    delete ret._id; // expose "id" via virtual, hide raw _id
    return ret;
  },
});

export type CircleDoc = InferSchemaType<typeof circleSchema>;
export default mongoose.model("Circle", circleSchema);
