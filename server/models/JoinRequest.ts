import mongoose, { Schema } from "mongoose";

export const JoinRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  companyId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export const JoinRequestModel = mongoose.model("JoinRequest", JoinRequestSchema);
