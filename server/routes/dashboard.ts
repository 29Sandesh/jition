import { Router } from "express";
import { WorkItemModel, ActivityModel, WorkspaceModel } from "../models";
import { requireAuth } from "../middleware/auth";
import { dashboardSummaryDefaults } from "../db";
import mongoose from "mongoose";

import { getWorkspaceRole } from "../middleware/permission";

export const dashboardRouter = Router();

// Apply requireAuth to all dashboard routes
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  try {
    const orgId = req.user!.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organisation context" });

    // Determine workspace ID from header, otherwise fall back to first workspace
    let workspaceId = req.headers["x-workspace-id"] as string;
    let query: any = { organisationId: orgId };

    if (workspaceId && workspaceId !== "default-workspace-id" && mongoose.Types.ObjectId.isValid(workspaceId)) {
      const role = await getWorkspaceRole(req.user!.id, workspaceId, req.user!.role, orgId);
      if (role === "None") {
        return res.status(403).json({ error: "Access denied: you are not a member of this workspace" });
      }
      query.workspaceId = workspaceId;
    } else {
      let firstWorkspace = await WorkspaceModel.findOne({ organisationId: orgId, memberIds: req.user!.id });
      if (!firstWorkspace && (req.user!.role === "Owner" || req.user!.role === "Admin" || req.user!.role === "Lead")) {
        firstWorkspace = await WorkspaceModel.findOne({ organisationId: orgId });
      }
      if (firstWorkspace) {
        query.workspaceId = firstWorkspace._id.toString();
      } else {
        return res.status(404).json({ error: "No workspaces found for this user" });
      }
    }

    // Query non-subtask workItems (parentTaskId: null) for the workspace
    const tasks = await WorkItemModel.find({ ...query, parentTaskId: null });
    
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status !== "Done").length;
    const completed = tasks.filter(t => t.status === "Done").length;
    
    const today = new Date();
    const overdueTasks = tasks.filter(t => t.status !== "Done" && t.dueDate && new Date(t.dueDate) < today).length;
    
    const workload: Record<string, number> = {};
    tasks.filter(t => t.status !== "Done").forEach(t => {
       if (!t.assigneeIds || t.assigneeIds.length === 0) {
          workload["Unassigned"] = (workload["Unassigned"] || 0) + 1;
       } else {
          t.assigneeIds.forEach(id => {
             workload[id] = (workload[id] || 0) + 1;
          });
       }
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    res.json({
      ...dashboardSummaryDefaults,
      activeTasks,
      completed,
      overdueTasks,
      workload,
      completionRate,
      onTrack: overdueTasks < 5
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch dashboard summary" });
  }
});

dashboardRouter.get("/activities", async (req, res) => {
  try {
    const orgId = req.user!.organisationId;
    if (!orgId) return res.status(400).json({ error: "Missing organisation context" });

    let workspaceId = req.headers["x-workspace-id"] as string;
    let query: any = { organisationId: orgId };

    if (workspaceId && workspaceId !== "default-workspace-id" && mongoose.Types.ObjectId.isValid(workspaceId)) {
      const role = await getWorkspaceRole(req.user!.id, workspaceId, req.user!.role, orgId);
      if (role === "None") {
        return res.status(403).json({ error: "Access denied: you are not a member of this workspace" });
      }
      query.workspaceId = workspaceId;
    }

    const activities = await ActivityModel.find(query).sort({ createdAt: -1 }).limit(25);
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch activities" });
  }
});

dashboardRouter.get("/chart-data", (req, res) => {
  const data = [
    { name: "Mon", tasks: 12, completion: 8 },
    { name: "Tue", tasks: 19, completion: 12 },
    { name: "Wed", tasks: 15, completion: 15 },
    { name: "Thu", tasks: 22, completion: 18 },
    { name: "Fri", stroke: "#0050cb", tasks: 28, completion: 25 },
    { name: "Sat", tasks: 10, completion: 4 },
    { name: "Sun", tasks: 5, completion: 5 },
  ];
  res.json(data);
});
