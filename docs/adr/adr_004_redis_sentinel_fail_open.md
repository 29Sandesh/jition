# Architecture Decision Record 004: Redis Sentinel Integration & Fail-Open Strategy

## Status
Approved

## Context
Redis is used for rate limiting, cache-aside data retrieval, session verification, and WebSocket clustering. During network splits or container reboots, the Redis cluster might go offline temporarily. 

By default, the `ioredis` library buffers commands in memory when the connection drops (`enableOfflineQueue: true`) and retries connection indefinitely. This causes requests to hang indefinitely in production, exhausting server resources (memory and socket connections) and causing the server to freeze.

## Decision
We configured The CirCle to fail open gracefully when Redis sentinel is unreachable.
1. **Disabled Offline Queue:** Set `enableOfflineQueue: false` and limited command retries with `maxRetriesPerRequest: 3`.
2. **Fail-Open Rate Limiter:** If the rate limiter encounters a Redis error (like connection refused), it catches the exception, logs a warning via Pino, and calls `next()` to allow the request to proceed.
3. **Fail-Open Cache-Aside:** If Redis queries fail, the cache layer bypasses Redis entirely, executing the lookup query directly against MongoDB.
4. **Sentinel Connection Failover:** Configured standard `sentinels` array parameters in the Redis client to allow automatic failover to master nodes.

## Consequences
* **Pros:**
  * **System Resilience:** A total Redis outage does not crash the system; users can still access the dashboard and read/write project tasks.
  * **No Memory Leaks:** Disabling command buffering prevents memory consumption from scaling up during connection failures.
* **Cons:**
  * **Rate Limiter Bypassed:** During a Redis outage, rate limit checks are temporarily bypassed, exposing the API to potential load spikes.
  * **Increased MongoDB Load:** Bypassing cache-aside increases read requests directly to MongoDB.
