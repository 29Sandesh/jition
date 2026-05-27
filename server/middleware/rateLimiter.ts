import { Request, Response, NextFunction } from "express";
import { redis, getOrSet, isRedisReady } from "../utils/cache";
import { OrganisationModel } from "../models/Organisation";

const WINDOW_MS = 60000; // 1 minute window

// Helper to get organisation plan with caching
async function getOrganisationPlan(orgId: string): Promise<string> {
  return getOrSet(`org:${orgId}:plan`, async () => {
    const org = await OrganisationModel.findById(orgId).lean();
    return org?.plan || "Free";
  }, 300); // cache for 5 minutes
}

// Sliding window check using Redis transaction
async function checkLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; currentCount: number }> {
  if (!isRedisReady()) {
    return { allowed: true, currentCount: 0 };
  }
  const now = Date.now();
  const clearBefore = now - windowMs;
  const member = `${now}-${Math.random()}`; // unique member

  try {
    const results = await redis.multi()
      .zremrangebyscore(key, 0, clearBefore)
      .zcard(key)
      .zadd(key, now, member)
      .pexpire(key, Math.ceil(windowMs / 1000) * 1000)
      .exec();

    if (!results) {
      return { allowed: true, currentCount: 0 };
    }

    // ioredis returns array of [err, res]
    const zcardResult = results[1];
    const currentCount = zcardResult && zcardResult[1] !== null ? (zcardResult[1] as number) : 0;

    return {
      allowed: currentCount < limit,
      currentCount: currentCount + 1,
    };
  } catch (error) {
    console.error(`Rate limit check failed for key ${key}:`, error);
    return { allowed: true, currentCount: 0 }; // Fail open to avoid blocking users on cache issue
  }
}

export async function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const userId = req.user?.id;
  const orgId = req.user?.organisationId || req.headers["x-organisation-id"] || req.headers["x-tenant-id"];

  // 1. IP Limiter (Always check, 100 requests per minute)
  const ipKey = `rate:ip:${ip}`;
  const ipLimit = 100;
  const ipCheck = await checkLimit(ipKey, ipLimit, WINDOW_MS);

  if (!ipCheck.allowed) {
    res.setHeader("Retry-After", WINDOW_MS / 1000);
    return res.status(429).json({ message: "Too many requests from this IP. Please try again later." });
  }

  // 2. User Limiter (If authenticated)
  if (userId) {
    const userKey = `rate:user:${userId}`;
    let userLimit = 200; // default standard user limit

    // Adjust limit by role or user tier if available
    if (req.user?.role === "Owner" || req.user?.role === "Admin") {
      userLimit = 500;
    }

    const userCheck = await checkLimit(userKey, userLimit, WINDOW_MS);
    if (!userCheck.allowed) {
      res.setHeader("Retry-After", WINDOW_MS / 1000);
      return res.status(429).json({ message: "User rate limit exceeded. Please try again later." });
    }
  }

  // 3. Tenant Limiter (If in an organisation context)
  if (orgId) {
    const tenantKey = `rate:tenant:${orgId}`;
    let tenantLimit = 500; // Default Free plan limit for entire organisation
    
    try {
      const plan = await getOrganisationPlan(orgId.toString());
      if (plan === "Pro") {
        tenantLimit = 2000;
      } else if (plan === "Enterprise") {
        tenantLimit = 10000;
      }
    } catch (e) {
      // Ignore organisation lookup error, use default limit
    }

    const tenantCheck = await checkLimit(tenantKey, tenantLimit, WINDOW_MS);
    if (!tenantCheck.allowed) {
      res.setHeader("Retry-After", WINDOW_MS / 1000);
      return res.status(429).json({ message: "Organisation rate limit exceeded for this billing tier." });
    }
  }

  next();
}
