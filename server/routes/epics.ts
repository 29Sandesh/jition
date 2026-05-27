import { Router } from "express";
import { EpicModel, ProjectModel } from "../models";
import { requireAuth } from "../middleware/auth";
import { getWorkspaceRole } from "../middleware/permission";

export const epicsRouter = Router();

// Apply auth to all epic routes
epicsRouter.use(requireAuth);

const ROLE_HIERARCHY = ["Viewer", "Member", "Editor", "Admin", "Owner"];

async function checkPermission(userId: string, orgRole: string, workspaceId: string, minRole: string, userOrgId?: string | null) {
  const userRole = await getWorkspaceRole(userId, workspaceId, orgRole, userOrgId);
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

// GET /api/projects/:projectId/epics - List epics in a project
epicsRouter.get("/projects/:projectId/epics", async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Read access is allowed for Viewer or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, project.workspaceId.toString(), "Viewer", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: insufficient permissions" });

    const epics = await EpicModel.find({ projectId: req.params.projectId });
    res.json(epics);
  } catch (err) {
    res.status(500).json({ message: "Error fetching epics" });
  }
});

// POST /api/projects/:projectId/epics - Create epic
epicsRouter.post("/projects/:projectId/epics", async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, project.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    const epic = await EpicModel.create({
      ...req.body,
      projectId: req.params.projectId,
      workspaceId: project.workspaceId,
      organisationId: project.organisationId
    });

    res.status(201).json(epic);
  } catch (err) {
    res.status(500).json({ message: "Error creating epic" });
  }
});

// PUT /api/epics/:id - Update epic
epicsRouter.put("/epics/:id", async (req, res) => {
  try {
    const epic = await EpicModel.findById(req.params.id);
    if (!epic) return res.status(404).json({ message: "Epic not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, epic.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    const updated = await EpicModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating epic" });
  }
});

import { executeCascadingSoftDelete } from "../utils/cascadeDelete";

// DELETE /api/epics/:id - Soft delete epic
epicsRouter.delete("/epics/:id", async (req, res) => {
  try {
    const epic = await EpicModel.findById(req.params.id);
    if (!epic) return res.status(404).json({ message: "Epic not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, epic.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    await executeCascadingSoftDelete("Epic", req.params.id, req.user!.organisationId.toString());
    res.json({ message: "Epic deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting epic" });
  }
});
