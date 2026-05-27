import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

export const traceStorage = new AsyncLocalStorage<string>();

// Structured Pino JSON Logger configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  mixin() {
    const traceId = traceStorage.getStore();
    return traceId ? { traceId } : {};
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

/**
 * Express middleware to attach and propagate unique request trace IDs
 */
export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingTraceId = req.headers["x-trace-id"] || req.headers["x-correlation-id"];
  const traceId = (incomingTraceId || uuidv4()).toString();

  res.setHeader("X-Trace-ID", traceId);

  traceStorage.run(traceId, () => {
    logger.info({ method: req.method, url: req.url, ip: req.ip }, "Incoming Request");
    
    // Log response status on finish
    res.on("finish", () => {
      logger.info({ status: res.statusCode }, "Request Completed");
    });

    next();
  });
}

/**
 * Helper to get active trace ID
 */
export function getTraceId(): string | undefined {
  return traceStorage.getStore();
}
