
import mongoose, { Schema, InferSchemaType } from "mongoose";

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text:   { type: String, trim: true, maxlength: 1000, required: true },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: -1 });

export type CommentDoc = InferSchemaType<typeof commentSchema>;
export default mongoose.model("Comment", commentSchema);