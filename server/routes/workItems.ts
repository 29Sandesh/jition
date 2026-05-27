import { Router } from "express";
import { WorkItemModel, EpicModel, StoryModel, ActivityModel, UserModel } from "../models";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceContext } from "../middleware/workspaceContext";
import { requireWorkspaceRole, getWorkspaceRole } from "../middleware/permission";
import { emitDomainEvent } from "../utils/eventSourcing";
import { webhookQueue } from "../jobs/queues";
import { upload, validateUploadBytes, uploadToS3 } from "../middleware/upload";
import { isRedisReady } from "../utils/cache";

export const workItemsRouter = Router();

// External API (Web Clipper) - uses Workspace ID for MVP
workItemsRouter.post("/external", async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    if (!workspaceId) return res.status(401).json({ error: "Missing workspace ID" });
    
    const item = await WorkItemModel.create({
      ...req.body,
      workspaceId,
      organisationId: workspaceId, // For MVP mock
      creatorId: null
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ error: "Error creating external task" });
  }
});

// Apply auth and workspace context middleware to all workItems routes
workItemsRouter.use(requireAuth);
workItemsRouter.use(requireWorkspaceContext);

import { paginate } from "../utils/pagination";

// GET /api/workItems - List work items (filtered by workspace context)
workItemsRouter.get("/", requireWorkspaceRole("Viewer"), async (req, res) => {
  try {
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    
    // Support filtering by parentTaskId or storyId or epicId if passed in query
    const query: any = { workspaceId };
    if (req.query.storyId) query.storyId = req.query.storyId;
    if (req.query.epicId) query.epicId = req.query.epicId;
    if (req.query.parentTaskId !== undefined) {
      query.parentTaskId = req.query.parentTaskId === "null" ? null : req.query.parentTaskId;
    }

    const result = await paginate(WorkItemModel, query, {
      limit: parseInt(req.query.limit as string) || 25,
      cursor: req.query.cursor as string,
      sort: req.query.sort as string,
      fields: req.query.fields as string
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching work items" });
  }
});

// GET /api/workItems/history - List history (completed work items and activities)
workItemsRouter.get("/history", requireWorkspaceRole("Viewer"), async (req, res) => {
  try {
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    
    // Done tasks in this workspace
    const doneTasks = await WorkItemModel.find({ 
      workspaceId, 
      status: "Done", 
      parentTaskId: null 
    }).sort({ updatedAt: -1 });

    // Activities in this workspace
    const activitiesQuery = await ActivityModel.find({ workspaceId }).sort({ createdAt: -1 });

    // Query all distinct user IDs from the activities to resolve their names
    const userIds = Array.from(new Set(activitiesQuery.map(act => act.user).filter(Boolean)));
    const users = await UserModel.find({ _id: { $in: userIds } }, { name: 1 });
    const userMap: Record<string, string> = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u.name;
    });

    // Map new activities to have the properties expected by the frontend
    const mappedActivities = activitiesQuery.map(act => ({
      id: act._id.toString(),
      user: userMap[act.user] || act.user || "Unknown User",
      action: act.action,
      target: act.target,
      oldValue: act.oldValue,
      newValue: act.newValue,
      time: new Date((act as any).createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date((act as any).createdAt).toLocaleDateString()
    }));

    res.json({ doneTasks, activities: mappedActivities });
  } catch (err) {
    console.error("Error fetching workItem history:", err);
    res.status(500).json({ message: "Error fetching history" });
  }
});

// GET /api/workItems/stories/:storyId/tasks - List tasks under a story
workItemsRouter.get("/stories/:storyId/tasks", requireWorkspaceRole("Viewer"), async (req, res) => {
  try {
    const { storyId } = req.params;
    const tasks = await WorkItemModel.find({ storyId, parentTaskId: null });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching story tasks" });
  }
});

// GET /api/workItems/tasks/:taskId/subtasks - List sub-tasks under a task
workItemsRouter.get("/tasks/:taskId/subtasks", requireWorkspaceRole("Viewer"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const subtasks = await WorkItemModel.find({ parentTaskId: taskId });
    res.json(subtasks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sub-tasks" });
  }
});

// POST /api/workItems/stories/:storyId/tasks - Create task under story
workItemsRouter.post("/stories/:storyId/tasks", requireWorkspaceRole("Editor"), async (req, res) => {
  try {
    const { storyId } = req.params;
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    const organisationId = (req.headers["x-organisation-id"] || req.user?.organisationId) as string;
    
    const story = await StoryModel.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.workspaceId.toString() !== workspaceId) {
      return res.status(403).json({ message: "Forbidden: Story does not belong to the active workspace" });
    }

    const item = await WorkItemModel.create({
      ...req.body,
      storyId,
      projectId: story.projectId,
      workspaceId,
      organisationId,
      creatorId: req.user?.id,
      parentTaskId: null
    });

    // Log activity
    await ActivityModel.create({
      organisationId,
      workspaceId,
      workItemId: item._id,
      user: req.user?.id,
      action: "created task",
      target: item.title,
    });

    // Event Sourcing
    await emitDomainEvent(item._id.toString(), "CREATED", item.toObject(), req.user!.id);

    // Dispatch Webhook Job
    if (isRedisReady()) {
      webhookQueue.add("delivery", {
        organisationId,
        event: "task.created",
        payload: item.toObject()
      }).catch(() => {});
    }

    res.status(201).json({ item });
  } catch (err) {
    console.error("Error creating story task:", err);
    res.status(500).json({ message: "Error creating task" });
  }
});

// POST /api/workItems/tasks/:taskId/subtasks - Create sub-task
workItemsRouter.post("/tasks/:taskId/subtasks", requireWorkspaceRole("Editor"), async (req, res) => {
  try {
    const { taskId } = req.params;
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    const organisationId = (req.headers["x-organisation-id"] || req.user?.organisationId) as string;

    const parentTask = await WorkItemModel.findById(taskId);
    if (!parentTask) return res.status(404).json({ message: "Parent task not found" });
    if (parentTask.workspaceId.toString() !== workspaceId) {
      return res.status(403).json({ message: "Forbidden: Parent task does not belong to the active workspace" });
    }

    const item = await WorkItemModel.create({
      ...req.body,
      storyId: parentTask.storyId,
      projectId: parentTask.projectId,
      workspaceId,
      organisationId,
      creatorId: req.user?.id,
      parentTaskId: taskId
    });

    // Log activity
    await ActivityModel.create({
      organisationId,
      workspaceId,
      workItemId: item._id,
      user: req.user?.id,
      action: "created subtask",
      target: item.title,
    });

    // Event Sourcing
    await emitDomainEvent(item._id.toString(), "CREATED", item.toObject(), req.user!.id);

    // Dispatch Webhook Job
    if (isRedisReady()) {
      webhookQueue.add("delivery", {
        organisationId,
        event: "task.created",
        payload: item.toObject()
      }).catch(() => {});
    }

    res.status(201).json({ item });
  } catch (err) {
    console.error("Error creating subtask:", err);
    res.status(500).json({ message: "Error creating subtask" });
  }
});

// POST /api/workItems - Create generic work item
workItemsRouter.post("/", requireWorkspaceRole("Editor"), async (req, res) => {
  try {
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    const organisationId = (req.headers["x-organisation-id"] || req.user?.organisationId) as string;
    
    if (!organisationId) return res.status(400).json({ message: "Missing organisation context" });

    const item = await WorkItemModel.create({
      ...req.body,
      workspaceId,
      organisationId,
      creatorId: req.user?.id
    });

    // Log activity
    await ActivityModel.create({
      organisationId,
      workspaceId,
      workItemId: item._id,
      user: req.user?.id,
      action: "created task",
      target: item.title,
    });

    // Event Sourcing
    await emitDomainEvent(item._id.toString(), "CREATED", item.toObject(), req.user!.id);

    // Dispatch Webhook Job
    if (isRedisReady()) {
      webhookQueue.add("delivery", {
        organisationId,
        event: "task.created",
        payload: item.toObject()
      }).catch(() => {});
    }

    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: "Error creating work item" });
  }
});

// PUT /api/workItems/:id
workItemsRouter.put("/:id", requireWorkspaceRole("Member"), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (Array.isArray(req.headers["x-workspace-id"]) ? req.headers["x-workspace-id"][0] : req.headers["x-workspace-id"]) as string;
    
    const updateData = { ...req.body };
    delete updateData.workspaceId;
    delete updateData.organisationId;

    const item = await WorkItemModel.findOneAndUpdate(
      { _id: id, workspaceId },
      { $set: updateData },
      { new: true }
    );
    
    if (!item) return res.status(404).json({ message: "Not found" });

    // Event Sourcing
    await emitDomainEvent(id, "UPDATED", req.body, req.user!.id);

    // Dispatch Webhook Job
    if (isRedisReady()) {
      webhookQueue.add("delivery", {
        organisationId: item.organisationId.toString(),
        event: "task.updated",
        payload: item.toObject()
      }).catch(() => {});
    }

    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: "Error updating work item" });
  }
});

import { executeCascadingSoftDelete } from "../utils/cascadeDelete";

// DELETE /api/workItems/:id
workItemsRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = (req.headers["x-organisation-id"] || req.user?.organisationId) as string;
    if (!organisationId) return res.status(400).json({ message: "Missing organisation context" });

    const item = await WorkItemModel.findById(id);
    if (!item) return res.status(404).json({ message: "WorkItem not found" });

    // Validate permission for the item's actual workspace
    const workspaceRole = await getWorkspaceRole(req.user!.id, item.workspaceId.toString(), req.user!.role, req.user!.organisationId);
    if (workspaceRole !== "Owner" && workspaceRole !== "Admin" && workspaceRole !== "Editor") {
      return res.status(403).json({ message: "Forbidden: requires Workspace Editor, Admin, or Owner role" });
    }

    await executeCascadingSoftDelete("WorkItem", id, organisationId.toString());
    
    // Event Sourcing
    await emitDomainEvent(id, "DELETED", { deletedAt: new Date(), deletedBy: req.user!.id }, req.user!.id);

    // Dispatch Webhook Job
    if (isRedisReady()) {
      webhookQueue.add("delivery", {
        organisationId,
        event: "task.deleted",
        payload: { id, deletedAt: new Date(), deletedBy: req.user!.id }
      }).catch(() => {});
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting work item" });
  }
});

// POST /api/workItems/:id/attachments - Secure S3-compatible attachment upload
workItemsRouter.post("/:id/attachments", upload.single("file"), validateUploadBytes, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const existingItem = await WorkItemModel.findById(id);
    if (!existingItem) {
      return res.status(404).json({ message: "Task not found" });
    }

    const workspaceRole = await getWorkspaceRole(req.user!.id, existingItem.workspaceId.toString(), req.user!.role, req.user!.organisationId);
    if (workspaceRole !== "Owner" && workspaceRole !== "Admin" && workspaceRole !== "Editor") {
      return res.status(403).json({ message: "Forbidden: requires Workspace Editor, Admin, or Owner role" });
    }

    const fileUrl = await uploadToS3(req.file);
    const item = await WorkItemModel.findByIdAndUpdate(
      id,
      { $push: { attachments: fileUrl } },
      { new: true }
    );
    
    if (!item) return res.status(404).json({ message: "Task not found" });
    res.json({ item, fileUrl });
  } catch (err) {
    console.error("Attachment upload route error:", err);
    res.status(500).json({ message: "Error uploading attachment" });
  }
});
