
import mongoose, { Schema, InferSchemaType } from "mongoose";

const likeSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// A user can like a post at most once
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export type LikeDoc = InferSchemaType<typeof likeSchema>;
export default mongoose.model("Like", likeSchema);