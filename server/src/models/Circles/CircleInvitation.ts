import mongoose, { Schema, Types, InferSchemaType } from "mongoose";

const circleInvitationSchema = new Schema(
  {
    circleId: { 
      type: Schema.Types.ObjectId, 
      ref: "Circle", 
      required: true 
    },
    inviteeId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    invitedBy: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["pending", "accepted", "declined"],
      default: "pending"
    },
    expiresAt: { 
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  },
  { timestamps: true }
);

// Indexes for quick lookups
circleInvitationSchema.index({ circleId: 1, inviteeId: 1 });
circleInvitationSchema.index({ inviteeId: 1, status: 1 });
circleInvitationSchema.index({ circleId: 1, status: 1 });
circleInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

export type CircleInvitationDoc = InferSchemaType<typeof circleInvitationSchema>;
export default mongoose.model("CircleInvitation", circleInvitationSchema);