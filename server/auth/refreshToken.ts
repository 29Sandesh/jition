import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { RefreshTokenModel } from "../models";

export const generateRefreshToken = async (userId: string, family?: string) => {
  const token = crypto.randomBytes(40).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  
  const tokenFamily = family || uuidv4();
  
  await RefreshTokenModel.create({
    userId,
    family: tokenFamily,
    token: hashedToken,
    used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  return { token, family: tokenFamily };
};

export const verifyAndRotateRefreshToken = async (token: string) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  
  const storedToken = await RefreshTokenModel.findOne({ token: hashedToken });
  
  if (!storedToken) {
    throw new Error("Invalid refresh token");
  }

  if (storedToken.used) {
    // Reuse detected! Invalidate the entire family.
    await RefreshTokenModel.updateMany({ family: storedToken.family }, { used: true });
    throw new Error("Refresh token reuse detected");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token expired");
  }

  // Mark as used
  storedToken.used = true;
  await storedToken.save();

  // Issue new token in the same family
  return generateRefreshToken(storedToken.userId.toString(), storedToken.family);
};
