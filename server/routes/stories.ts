import { Router } from "express";
import { StoryModel, EpicModel } from "../models";
import { requireAuth } from "../middleware/auth";
import { getWorkspaceRole } from "../middleware/permission";

export const storiesRouter = Router();

// Apply auth to all story routes
storiesRouter.use(requireAuth);

const ROLE_HIERARCHY = ["Viewer", "Member", "Editor", "Admin", "Owner"];

async function checkPermission(userId: string, orgRole: string, workspaceId: string, minRole: string, userOrgId?: string | null) {
  const userRole = await getWorkspaceRole(userId, workspaceId, orgRole, userOrgId);
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

// GET /api/epics/:epicId/stories - List stories in an epic
storiesRouter.get("/epics/:epicId/stories", async (req, res) => {
  try {
    const epic = await EpicModel.findById(req.params.epicId);
    if (!epic) return res.status(404).json({ message: "Epic not found" });

    // Read access is allowed for Viewer or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, epic.workspaceId.toString(), "Viewer", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: insufficient permissions" });

    const stories = await StoryModel.find({ epicId: req.params.epicId });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: "Error fetching stories" });
  }
});

// POST /api/epics/:epicId/stories - Create story
storiesRouter.post("/epics/:epicId/stories", async (req, res) => {
  try {
    const epic = await EpicModel.findById(req.params.epicId);
    if (!epic) return res.status(404).json({ message: "Epic not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, epic.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    const story = await StoryModel.create({
      ...req.body,
      epicId: req.params.epicId,
      projectId: epic.projectId,
      workspaceId: epic.workspaceId,
      organisationId: epic.organisationId
    });

    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ message: "Error creating story" });
  }
});

// PUT /api/stories/:id - Update story
storiesRouter.put("/stories/:id", async (req, res) => {
  try {
    const story = await StoryModel.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, story.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    const updated = await StoryModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating story" });
  }
});

import { executeCascadingSoftDelete } from "../utils/cascadeDelete";

// DELETE /api/stories/:id - Soft delete story
storiesRouter.delete("/stories/:id", async (req, res) => {
  try {
    const story = await StoryModel.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });

    // Write access requires Editor or above
    const allowed = await checkPermission(req.user!.id, req.user!.role, story.workspaceId.toString(), "Editor", req.user!.organisationId);
    if (!allowed) return res.status(403).json({ message: "Forbidden: requires Editor or above" });

    await executeCascadingSoftDelete("Story", req.params.id, req.user!.organisationId.toString());
    res.json({ message: "Story deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting story" });
  }
});
