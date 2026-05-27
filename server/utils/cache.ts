import Redis from "ioredis";

const sentinelsEnv = process.env.REDIS_SENTINELS;
const masterName = process.env.REDIS_MASTER_NAME || "mymaster";

let redis: Redis;

try {
  if (sentinelsEnv) {
    const sentinels = sentinelsEnv.split(",").map((s) => {
      const [host, port] = s.split(":");
      return { host, port: parseInt(port, 10) || 26379 };
    });
    console.log(`Connecting to Redis Sentinel cluster. Master: ${masterName}, Sentinels:`, sentinels);
    redis = new Redis({
      sentinels,
      name: masterName,
      sentinelRetryStrategy: (times) => Math.min(times * 100, 2000),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });
  } else {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    console.log(`Connecting to standalone Redis at: ${url}`);
    redis = new Redis(url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });
  }

  redis.on("error", (err) => {
    console.error("Redis Connection Error:", err.message);
  });

  redis.on("connect", () => {
    console.log("Successfully connected to Redis.");
  });
} catch (error) {
  console.error("Failed to initialize Redis client, using mock/stub:", error);
  // Fail-safe mock if Redis cannot be instantiated
  redis = new Proxy({} as any, {
    get: () => () => Promise.resolve(null)
  });
}

export { redis };

export function isRedisReady(): boolean {
  return redis && redis.status === "ready";
}

/**
 * Cache-aside helper pattern.
 * Retrieves data from cache. If not found, runs fetchFn, caches the result, and returns it.
 */
import { cacheOperationsMetric } from "./metrics";

export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  if (!isRedisReady()) {
    return fetchFn();
  }
  try {
    const cached = await redis.get(key);
    if (cached) {
      cacheOperationsMetric.inc({ status: "hit" });
      return JSON.parse(cached) as T;
    }
    cacheOperationsMetric.inc({ status: "miss" });
  } catch (error) {
    console.error(`Cache get failed for key ${key}:`, error);
    cacheOperationsMetric.inc({ status: "miss" });
  }

  const freshData = await fetchFn();

  try {
    if (freshData !== undefined && freshData !== null) {
      await redis.set(key, JSON.stringify(freshData), "EX", ttlSeconds);
    }
  } catch (error) {
    console.error(`Cache set failed for key ${key}:`, error);
  }

  return freshData;
}

/**
 * Delete a specific key or list of keys
 */
export async function invalidateCache(keys: string | string[]): Promise<void> {
  if (!isRedisReady()) return;
  try {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length > 0) {
      await redis.del(...keyList);
    }
  } catch (error) {
    console.error("Cache invalidation failed:", error);
  }
}
