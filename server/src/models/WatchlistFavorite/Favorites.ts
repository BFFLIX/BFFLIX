// models/WatchlistFavorite/favorite.model.ts
import mongoose, { Schema, Types } from "mongoose";

const favoriteSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:      { type: String, enum: ["movie", "tv"], required: true },
    tmdbId:    { type: String, required: true, trim: true },
    title:     { type: String, trim: true },
    posterPath:{ type: String, trim: true },
    releaseDate:{ type: String, trim: true },
    favoritedAt:{ type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

favoriteSchema.virtual("id").get(function (this: { _id: Types.ObjectId }) {
  return this._id.toHexString();
});

favoriteSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform(_doc: any, ret: any) {
    delete ret._id;
    return ret;
  },
});

export default mongoose.model("Favorite", favoriteSchema);
