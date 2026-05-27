import mongoose, { Schema } from "mongoose";

export const RefreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  family: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String },
  ip: { type: String },
}, { timestamps: true });

export const RefreshTokenModel = mongoose.model("RefreshToken", RefreshTokenSchema);
