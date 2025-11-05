
import mongoose, { Schema, InferSchemaType, Types } from "mongoose";

const viewingSchema = new Schema(
  {
    userId:  { type: Schema.Types.ObjectId, ref: "User", required: true },

    // movie vs tv
    type:    { type: String, enum: ["movie", "tv"], required: true },
    tmdbId:  { type: String, required: true, trim: true },

    // optional episode context (tv)
    seasonNumber:  { type: Number, min: 0 },
    episodeNumber: { type: Number, min: 0 },

    rating:   { type: Number, min: 1, max: 5 },
    comment:  { type: String, trim: true, maxlength: 1000 },

    // default now (we also guard against far-future dates below)
    watchedAt:{ type: Date, default: () => new Date() },

    // client-supplied key to prevent accidental duplicates
    // (unique+sparse allows many docs without this field)
    idemKey:  { type: String, index: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

// ---------- Validation hooks ----------
viewingSchema.pre("validate", function (next) {
  const doc = this as mongoose.Document & {
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    watchedAt?: Date | null;
    comment?: string | null;
  };

  // If episodeNumber is provided, seasonNumber must be present
  if (doc.episodeNumber != null && doc.seasonNumber == null) {
    return next(new Error("seasonNumber is required when episodeNumber is provided"));
  }

  // Reject watchedAt more than 5 minutes in the future
  const nowPlus5m = Date.now() + 5 * 60 * 1000;
  if (doc.watchedAt && doc.watchedAt.getTime() > nowPlus5m) {
    return next(new Error("watchedAt cannot be in the future"));
  }

  // Defensive trim (schema already trims comment)
  if (typeof doc.comment === "string") {
    doc.set("comment", doc.comment.trim());
  }

  next();
});

// ---------- Indexes ----------
viewingSchema.index({ userId: 1, watchedAt: -1 }); // for /viewings/me timeline
viewingSchema.index({ tmdbId: 1, type: 1 });       // helpful for title lookups

// ---------- Virtual id + toJSON shaping ----------
viewingSchema.virtual("id").get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});

viewingSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc: any, ret: any) {
    delete ret._id; // expose "id" via virtual, hide raw _id
    return ret;
  },
});

export type ViewingDoc = InferSchemaType<typeof viewingSchema>;
export default mongoose.model("Viewing", viewingSchema);
