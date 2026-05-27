import { Router } from "express";
import { ProjectModel, WorkspaceModel } from "../models";
import { requireAuth } from "../middleware/auth";
import { getWorkspaceRole, requireWorkspaceRole } from "../middleware/permission";

export const projectsRouter = Router();

// Apply auth to all project routes
projectsRouter.use(requireAuth);

// GET /api/workspaces/:wsId/projects - List projects in a workspace
projectsRouter.get("/workspaces/:wsId/projects", requireWorkspaceRole("Viewer"), async (req, res) => {
  try {
    const projects = await ProjectModel.find({ workspaceId: req.params.wsId });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

// POST /api/workspaces/:wsId/projects - Create project
projectsRouter.post("/workspaces/:wsId/projects", requireWorkspaceRole("Admin"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.wsId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const project = await ProjectModel.create({
      ...req.body,
      workspaceId: req.params.wsId,
      organisationId: workspace.organisationId
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: "Error creating project" });
  }
});

// PUT /api/projects/:id - Update project
projectsRouter.put("/projects/:id", async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Enforce workspace admin permission
    const workspaceRole = await getWorkspaceRole(req.user!.id, project.workspaceId.toString(), req.user!.role, req.user!.organisationId);
    if (workspaceRole !== "Owner" && workspaceRole !== "Admin") {
      return res.status(403).json({ message: "Forbidden: requires Workspace Admin or Owner role" });
    }

    const updated = await ProjectModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating project" });
  }
});

import { executeCascadingSoftDelete } from "../utils/cascadeDelete";

// DELETE /api/projects/:id - Soft delete project
projectsRouter.delete("/projects/:id", async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Enforce workspace admin permission
    const workspaceRole = await getWorkspaceRole(req.user!.id, project.workspaceId.toString(), req.user!.role, req.user!.organisationId);
    if (workspaceRole !== "Owner" && workspaceRole !== "Admin") {
      return res.status(403).json({ message: "Forbidden: requires Workspace Admin or Owner role" });
    }

    await executeCascadingSoftDelete("Project", req.params.id, req.user!.organisationId.toString());
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting project" });
  }
});
