import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { verifyAccessToken } from "../auth/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_local_dev_only";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Fast path: if user context was already extracted globally, avoid redundant DB queries
  if (req.user) {
    return next();
  }

  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      console.log("Auth failed: No token");
      return res.status(401).json({ message: "Authentication required" });
    }

    let decoded: any = null;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      console.log("verifyAccessToken threw error:", e);
    }

    if (!decoded) {
      console.log("verifyAccessToken returned null for token:", token.substring(0, 20) + '...');
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (error) {
        console.log("Fallback jwt.verify also failed");
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }

    const userId = decoded.userId || decoded.id;
    const user = await UserModel.findById(userId);
    if (!user) {
      console.log("User not found:", userId);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      organisationId: user.organisationId ? user.organisationId.toString() : null
    };
    next();
  } catch (error) {
    console.error("requireAuth top level error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

export async function extractUserContext(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      let decoded: any = null;
      try {
        decoded = verifyAccessToken(token);
      } catch (e) {
        // ignore
      }

      if (!decoded) {
        try {
          decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (error) {
          // ignore
        }
      }

      if (decoded) {
        const userId = decoded.userId || decoded.id;
        const user = await UserModel.findById(userId);
        if (user) {
          req.user = {
            id: user._id.toString(),
            role: user.role,
            organisationId: user.organisationId ? user.organisationId.toString() : null
          };
        }
      }
    }
  } catch (error) {
    // Fail silently
  }
  next();
}

