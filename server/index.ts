import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { tenantContextMiddleware } from "./middleware/tenantIsolation";
import { rateLimiterMiddleware } from "./middleware/rateLimiter";
import { initChangeStreams } from "./db/changeStream";
import { traceMiddleware } from "./utils/logger";

// Routers
import { authRouter } from "./routes/auth";
import { organisationsRouter } from "./routes/organisations";
import { workspacesRouter } from "./routes/workspaces";
import { projectsRouter } from "./routes/projects";
import { epicsRouter } from "./routes/epics";
import { storiesRouter } from "./routes/stories";
import { workItemsRouter } from "./routes/workItems";
import { dashboardRouter } from "./routes/dashboard";
import { chatRouter } from "./routes/chat";
import { webhooksRouter } from "./routes/webhooks";
import { chaosRouter } from "./routes/chaos";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 0. Trace ID Propagation Middleware
  app.use(traceMiddleware);

  // 1. Security Headers via Helmet.js
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'", "ws:", "wss:"],
              },
            }
          : false, // Bypass strict CSP in development to allow Vite HMR
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: "deny",
      },
    })
  );

  // 1. Basic body and cookie parsers
  app.use(express.json());
  app.use(cookieParser());

  // 2. Light user context extractor
  const { extractUserContext } = await import("./middleware/auth");
  app.use(extractUserContext);

  // 3. Global rate limiter (per user/IP/tenant sliding window)
  app.use("/api", rateLimiterMiddleware);

  // 4. Tenant Context middleware
  app.use(tenantContextMiddleware);

  // Chaos Engineering Middleware (Dev Only)
  if (process.env.NODE_ENV !== "production") {
    import("./routes/chaos").then(({ getChaosConfig }) => {
      app.use("/api", (req, res, next) => {
        if (req.path.startsWith("/chaos")) return next();
        const config = getChaosConfig();
        if (!config.enabled) return next();

        if (Math.random() < config.errorRate) {
          console.warn(`[CHAOS] Injecting 500 Error for ${req.method} ${req.originalUrl}`);
          return res.status(500).json({ error: "Chaos monkey killed this request." });
        }

        const delay = Math.floor(Math.random() * (config.delayMax - config.delayMin + 1) + config.delayMin);
        console.warn(`[CHAOS] Injecting ${delay}ms delay for ${req.method} ${req.originalUrl}`);
        setTimeout(() => next(), delay);
      });
    });
  }

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/organisations", organisationsRouter);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api", projectsRouter);
  app.use("/api", epicsRouter);
  app.use("/api", storiesRouter);
  app.use("/api/workItems", workItemsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/chaos", chaosRouter);

  // 3. Parallel GraphQL Endpoint
  const { requireAuth } = await import("./middleware/auth");
  const { createApolloServer, apolloExpressMiddleware, setupGraphQLSubscriptions } = await import("./graphql");
  
  const apolloServer = await createApolloServer();
  app.use("/graphql", requireAuth, apolloExpressMiddleware(apolloServer));

  // Initialize GraphQL subscriptions WebSocket server
  setupGraphQLSubscriptions(httpServer, apolloServer);

  // 4. Socket.io Cluster setup
  const { setupSocketServer } = await import("./socket");
  setupSocketServer(httpServer);

  // 5. Initialize cache invalidation watchers
  initChangeStreams();

  // Prometheus Metrics endpoint
  app.get("/metrics", async (req, res) => {
    try {
      const { collectQueueMetrics, register: promRegister } = await import("./utils/metrics");
      await collectQueueMetrics();
      res.set("Content-Type", promRegister.contentType);
      res.end(await promRegister.metrics());
    } catch (err: any) {
      res.status(500).end(err.message || err);
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "The CirCle API is fully operational" });
  });

  // Vite dev or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
