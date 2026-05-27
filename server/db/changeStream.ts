import { WorkItemModel } from "../models/WorkItem";
import { StoryModel } from "../models/Story";
import { EpicModel } from "../models/Epic";
import { ProjectModel } from "../models/Project";
import { WorkspaceModel } from "../models/Workspace";
import { OrganisationModel } from "../models/Organisation";
import { UserModel } from "../models/User";
import { ActivityModel } from "../models/Activity";
import { invalidateCache } from "../utils/cache";

export function initChangeStreams() {
  console.log("Initializing MongoDB Change Streams for Cache Invalidation...");

  // 1. WorkItem (Task/Subtask) Change Stream
  WorkItemModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const doc = change.fullDocument;
        const docId = change.documentKey._id.toString();

        const keysToInvalidate: string[] = [`workitem:${docId}`];

        if (doc) {
          if (doc.workspaceId) {
            keysToInvalidate.push(`workspace:${doc.workspaceId}:workitems`);
          }
          if (doc.storyId) {
            keysToInvalidate.push(`story:${doc.storyId}:tasks`);
          }
          if (doc.parentTaskId) {
            keysToInvalidate.push(`task:${doc.parentTaskId}:subtasks`);
          }
        }

        await invalidateCache(keysToInvalidate);

        // Broadcast changes via Socket.io to the workspace room
        const { socketIoInstance } = await import("../socket");
        if (socketIoInstance && doc && doc.workspaceId) {
          const roomName = `workspace:${doc.workspaceId.toString()}`;
          if (change.operationType === "insert") {
            socketIoInstance.to(roomName).emit("task-created-c", doc);
          } else if (change.operationType === "update" || change.operationType === "replace") {
            socketIoInstance.to(roomName).emit("task-updated-c", doc);
          } else if (change.operationType === "delete") {
            socketIoInstance.to(roomName).emit("task-deleted-c", { _id: docId });
          }
        }
      } catch (error) {
        console.error("Error in WorkItem change stream cache invalidation:", error);
      }
    })
    .on("error", (err) => {
      console.error("WorkItem Change Stream watch error caught gracefully:", err.message);
    });

  // 2. Story Change Stream
  StoryModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const doc = change.fullDocument;
        const docId = change.documentKey._id.toString();
        const keysToInvalidate = [`story:${docId}`];

        if (doc && doc.workspaceId) {
          keysToInvalidate.push(`workspace:${doc.workspaceId}:stories`);
        }
        await invalidateCache(keysToInvalidate);
      } catch (error) {
        console.error("Error in Story change stream cache invalidation:", error);
      }
    })
    .on("error", (err) => {
      console.error("Story Change Stream watch error caught gracefully:", err.message);
    });

  // 3. Epic Change Stream
  EpicModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const doc = change.fullDocument;
        const docId = change.documentKey._id.toString();
        const keysToInvalidate = [`epic:${docId}`];

        if (doc && doc.workspaceId) {
          keysToInvalidate.push(`workspace:${doc.workspaceId}:epics`);
        }
        await invalidateCache(keysToInvalidate);
      } catch (error) {
        console.error("Error in Epic change stream cache invalidation:", error);
      }
    })
    .on("error", (err) => {
      console.error("Epic Change Stream watch error caught gracefully:", err.message);
    });

  // 4. Project Change Stream
  ProjectModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const doc = change.fullDocument;
        const docId = change.documentKey._id.toString();
        const keysToInvalidate = [`project:${docId}`];

        if (doc && doc.workspaceId) {
          keysToInvalidate.push(`workspace:${doc.workspaceId}:projects`);
        }
        await invalidateCache(keysToInvalidate);
      } catch (error) {
        console.error("Error in Project change stream cache invalidation:", error);
      }
    })
    .on("error", (err) => {
      console.error("Project Change Stream watch error caught gracefully:", err.message);
    });

  // 5. Organisation Plan updates
  OrganisationModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const docId = change.documentKey._id.toString();
        await invalidateCache(`org:${docId}:plan`);
      } catch (error) {
        console.error("Error in Organisation change stream cache invalidation:", error);
      }
    })
    .on("error", (err) => {
      console.error("Organisation Change Stream watch error caught gracefully:", err.message);
    });

  // 6. Activity (Audit Log / Timeline) Change Stream - Pushes popup notifications to workspace groups
  ActivityModel.watch([], { fullDocument: "updateLookup" })
    .on("change", async (change) => {
      try {
        const doc = change.fullDocument;
        if (doc && doc.workspaceId && change.operationType === "insert") {
          const { socketIoInstance } = await import("../socket");
          if (socketIoInstance) {
            const user = await UserModel.findById(doc.user).lean();
            const userName = user ? user.name : "Someone";
            
            socketIoInstance.to(`workspace:${doc.workspaceId.toString()}`).emit("activity-notification", {
              userName,
              action: doc.action,
              target: doc.target,
              oldValue: doc.oldValue,
              newValue: doc.newValue,
              userId: doc.user
            });
          }
        }
      } catch (error) {
        console.error("Error in Activity change stream notification:", error);
      }
    })
    .on("error", (err) => {
      console.error("Activity Change Stream watch error caught gracefully:", err.message);
    });
}
