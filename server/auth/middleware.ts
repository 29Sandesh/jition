import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    
    if (payload) {
      // @ts-ignore
      req.userId = payload.userId;
      return next();
    }
  }

  // Fallback for Phase 1 transition (if frontend hasn't been updated yet)
  const legacyUserId = req.headers["x-user-id"] as string;
  if (legacyUserId) {
    // @ts-ignore
    req.userId = legacyUserId;
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
};
