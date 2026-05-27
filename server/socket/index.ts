import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import cookie from "cookie";
import { verifyAccessToken } from "../auth/jwt";
import { WorkItemModel } from "../models/WorkItem";
import { UserModel } from "../models/User";
import { WorkspaceModel } from "../models/Workspace";
import * as Y from "yjs";

const sentinelsEnv = process.env.REDIS_SENTINELS;
const masterName = process.env.REDIS_MASTER_NAME || "mymaster";

const connectionOptions: any = sentinelsEnv
  ? {
      sentinels: sentinelsEnv.split(",").map((s) => {
        const [host, port] = s.split(":");
        return { host, port: parseInt(port, 10) || 26379 };
      }),
      name: masterName,
      sentinelRetryStrategy: (times: number) => Math.min(times * 100, 2000),
      maxRetriesPerRequest: null,
    }
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      maxRetriesPerRequest: null,
    };

import { isRedisReady } from "../utils/cache";

let pubClient: any = null;
let subClient: any = null;

if (process.env.NODE_ENV === "production") {
  pubClient = new Redis(
    sentinelsEnv ? connectionOptions : (process.env.REDIS_URL || "redis://127.0.0.1:6379"),
    { 
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    }
  );
  subClient = pubClient.duplicate();

  pubClient.on("error", (err: any) => {
    if (pubClient.status !== "ready") return;
    console.error("Socket PubClient Redis Error:", err.message);
  });
  subClient.on("error", (err: any) => {
    if (subClient.status !== "ready") return;
    console.error("Socket SubClient Redis Error:", err.message);
  });
}

import { activeSocketConnections } from "../utils/metrics";

export let socketIoInstance: Server | null = null;

export function setupSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });
  socketIoInstance = io;

  if (process.env.NODE_ENV === "production" && pubClient && subClient && isRedisReady()) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.io Redis adapter enabled successfully.");
  } else {
    console.log("Socket.io Redis adapter bypassed: Running in development or Redis is offline. Using default in-memory adapter.");
  }

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.jwt || socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication error: Token required"));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await UserModel.findById(decoded.userId).lean();
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.data.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organisationId: user.organisationId?.toString()
      };
      next();
    } catch (err: any) {
      next(new Error("Authentication error: Exception during verification"));
    }
  });

  // Keep Yjs Documents in memory
  const activeDocs = new Map<string, Y.Doc>();

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    console.log(`Real-time user connected: ${user.name} (${user.id})`);
    
    // Increment active connections
    activeSocketConnections.inc();

    // Auto-join rooms for all workspaces this user is a member of
    try {
      const workspaces = await WorkspaceModel.find({ memberIds: user.id }).lean();
      for (const ws of workspaces) {
        const roomName = `workspace:${ws._id.toString()}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} (User: ${user.name}) auto-joined workspace channel: ${ws._id.toString()}`);
      }
    } catch (err) {
      console.error("Error auto-joining workspace rooms for socket:", err);
    }

    // Channel Rooms (manual handler validation)
    socket.on("join-workspace", async (workspaceId: string) => {
      try {
        const hasAccess = await WorkspaceModel.exists({ _id: workspaceId, memberIds: user.id });
        if (hasAccess) {
          socket.join(`workspace:${workspaceId}`);
          console.log(`Socket ${socket.id} manually joined workspace channel: ${workspaceId}`);
        } else {
          console.warn(`Unauthorised socket room join attempt by user ${user.id} on workspace ${workspaceId}`);
        }
      } catch (err) {
        console.error("Error checking workspace membership for socket:", err);
      }
    });

    socket.on("leave-workspace", (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
      console.log(`Socket ${socket.id} left workspace channel: ${workspaceId}`);
    });

    // Yjs Collaboration Room Join (with authorization validation)
    socket.on("join-document", async (documentId: string) => {
      try {
        const task = await WorkItemModel.findById(documentId).lean();
        if (!task) {
          console.warn(`Socket room join attempt for non-existent document: ${documentId}`);
          return;
        }

        // Check if user is a member of the workspace the task belongs to
        const hasAccess = await WorkspaceModel.exists({ _id: task.workspaceId, memberIds: user.id });
        if (!hasAccess) {
          console.warn(`Unauthorised socket document join attempt by user ${user.id} on task ${documentId}`);
          return;
        }

        socket.join(`doc:${documentId}`);
        console.log(`Socket ${socket.id} joined document: ${documentId}`);

        let doc = activeDocs.get(documentId);
        if (!doc) {
          doc = new Y.Doc();
          activeDocs.set(documentId, doc);

          // Load existing plain description from MongoDB and populate
          if (task.description) {
            const ytext = doc.getText("content");
            ytext.insert(0, task.description);
          }
        }

        // Initial Sync: Send current state vector to client
        const stateVector = Y.encodeStateAsUpdate(doc);
        socket.emit("document-init", Buffer.from(stateVector));

        // Listen to updates from this client
        socket.on("document-update", async (updateData: ArrayBuffer) => {
          try {
            const update = new Uint8Array(updateData);
            Y.applyUpdate(doc!, update);

            // Broadcast change to other editors of the document
            socket.to(`doc:${documentId}`).emit("document-update", updateData);

            // Periodically sync the converged text back to the primary DB
            const currentText = doc!.getText("content").toString();
            await WorkItemModel.updateOne({ _id: documentId }, { $set: { description: currentText } });
          } catch (error) {
            console.error(`Error applying CRDT update for doc ${documentId}:`, error);
          }
        });
      } catch (err) {
        console.error("Error joining document socket room:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Real-time user disconnected: ${user.name}`);
      // Decrement active connections
      activeSocketConnections.dec();
    });
  });

  return io;
}
