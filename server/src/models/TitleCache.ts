
// server/src/models/TitleCache.ts
import mongoose, { Schema, InferSchemaType } from "mongoose";

const titleCacheSchema = new Schema(
  {
    tmdbId: { type: String, required: true, index: true },
    type:   { type: String, enum: ["movie", "tv"], required: true, index: true },
    region: { type: String, default: "US", index: true },

    // normalized to your enum: ["netflix","hulu","max","prime","disney","peacock"]
    providers: { type: [String], default: [] },

    // optional metadata if you want later
    source: { type: String, enum: ["fresh", "stale"], default: "fresh" },
  },
  { timestamps: true }
);

titleCacheSchema.index({ tmdbId: 1, type: 1, region: 1 }, { unique: true });

export type TitleCacheDoc = InferSchemaType<typeof titleCacheSchema>;
export default mongoose.model("TitleCache", titleCacheSchema);