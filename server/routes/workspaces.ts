import { Router } from "express";
import { WorkspaceModel, WorkspaceMemberModel, UserModel, OrganisationModel, writeAuditLog } from "../models";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceRole } from "../middleware/permission";
import { generateBlindIndex } from "../utils/encryption";

export const workspacesRouter = Router();

// Apply auth to all workspace routes
workspacesRouter.use(requireAuth);

// GET /api/workspaces - List workspaces in the user's organisation
workspacesRouter.get("/", async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ message: "No organisation context" });

    let query: any = { organisationId: orgId };
    
    // Non-admins only see workspaces they are members of
    if (req.user?.role !== "Owner" && req.user?.role !== "Admin") {
      query.memberIds = req.user?.id;
    }

    const workspaces = await WorkspaceModel.find(query);
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: "Error fetching workspaces" });
  }
});

// POST /api/workspaces - Create workspace (Org Owner/Admin only)
workspacesRouter.post("/", async (req, res) => {
  try {
    if (req.user?.role !== "Owner" && req.user?.role !== "Admin") {
      return res.status(403).json({ message: "Only Organisation Owners or Admins can create workspaces" });
    }

    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ message: "No organisation context" });

    const workspace = await WorkspaceModel.create({
      ...req.body,
      organisationId: orgId,
      memberIds: [req.user.id]
    });

    // Create a WorkspaceMember entry as Owner for the creator
    await WorkspaceMemberModel.create({
      workspaceId: workspace._id,
      userId: req.user.id,
      role: "Owner",
      organisationId: orgId
    });

    res.status(201).json(workspace);
  } catch (err) {
    res.status(500).json({ message: "Error creating workspace" });
  }
});

// GET /api/workspaces/:id - Get a single workspace
workspacesRouter.get("/:id", requireWorkspaceRole("Viewer", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: "Error fetching workspace" });
  }
});

// PUT /api/workspaces/:id - Update workspace details
workspacesRouter.put("/:id", requireWorkspaceRole("Admin", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: "Error updating workspace" });
  }
});

// GET /api/workspaces/:id/members - List members and their workspace-scoped roles
workspacesRouter.get("/:id/members", requireWorkspaceRole("Viewer", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Find all users in workspace.memberIds
    const users = await UserModel.find({ _id: { $in: workspace.memberIds } }, { password: 0 });
    
    // Find all workspace member roles
    const workspaceMembers = await WorkspaceMemberModel.find({ workspaceId: workspace._id });

    // Map them together
    const membersWithRoles = users.map(user => {
      const wMember = workspaceMembers.find(wm => wm.userId.toString() === user._id.toString());
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        orgRole: user.role,
        avatar: (user as any).avatar || null,
        jobTitle: (user as any).jobTitle || "",
        bio: (user as any).bio || "",
        workspaceRole: wMember ? wMember.role : (user.role === "Owner" || user.role === "Admin" ? user.role : "Member")
      };
    });

    res.json(membersWithRoles);
  } catch (err) {
    res.status(500).json({ message: "Error fetching workspace members" });
  }
});

// POST /api/workspaces/:id/members - Add a member to a workspace
workspacesRouter.post("/:id/members", requireWorkspaceRole("Admin", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const { email, userId, role } = req.body;
    let targetUser = null;

    if (userId) {
      targetUser = await UserModel.findById(userId);
    } else if (email) {
      const emailHash = generateBlindIndex(email);
      targetUser = await UserModel.findOne({ emailHash, organisationId: workspace.organisationId });
    }

    if (!targetUser) {
      return res.status(404).json({ message: "User not found in this organisation" });
    }

    const userIdStr = targetUser._id.toString();

    // Add to memberIds if not already there
    if (!workspace.memberIds.includes(userIdStr)) {
      workspace.memberIds.push(userIdStr);
      await workspace.save();
    }

    // Create or update workspace member role
    const updatedMember = await WorkspaceMemberModel.findOneAndUpdate(
      { workspaceId: workspace._id, userId: targetUser._id },
      { 
        $set: { 
          role: role || "Member",
          organisationId: workspace.organisationId
        } 
      },
      { upsert: true, new: true }
    );

    await writeAuditLog(
      req.user!.id,
      "WORKSPACE_MEMBER_ADD",
      `Workspace:${workspace._id}|User:${targetUser._id}|Role:${updatedMember.role}`,
      req.ip || "127.0.0.1",
      req.headers["user-agent"] || "unknown"
    );

    res.json({
      message: "Member added successfully",
      member: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        workspaceRole: updatedMember.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error adding workspace member" });
  }
});

// PUT /api/workspaces/:id/members/:userId - Change member role
workspacesRouter.put("/:id/members/:userId", requireWorkspaceRole("Admin", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });

    const updatedMember = await WorkspaceMemberModel.findOneAndUpdate(
      { workspaceId: workspace._id, userId: req.params.userId },
      { $set: { role } },
      { upsert: true, new: true }
    );

    await writeAuditLog(
      req.user!.id,
      "WORKSPACE_MEMBER_UPDATE",
      `Workspace:${workspace._id}|User:${req.params.userId}|Role:${role}`,
      req.ip || "127.0.0.1",
      req.headers["user-agent"] || "unknown"
    );

    res.json({ message: "Workspace role updated", member: updatedMember });
  } catch (err) {
    res.status(500).json({ message: "Error updating workspace member role" });
  }
});

// DELETE /api/workspaces/:id/members/:userId - Remove member from workspace
workspacesRouter.delete("/:id/members/:userId", requireWorkspaceRole("Admin", "id"), async (req, res) => {
  try {
    const workspace = await WorkspaceModel.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const targetUserId = req.params.userId;

    // Remove from memberIds list
    workspace.memberIds = workspace.memberIds.filter(id => id !== targetUserId);
    await workspace.save();

    // Soft delete / delete WorkspaceMember record
    await WorkspaceMemberModel.deleteOne({ workspaceId: workspace._id, userId: targetUserId });

    await writeAuditLog(
      req.user!.id,
      "WORKSPACE_MEMBER_REMOVE",
      `Workspace:${workspace._id}|User:${targetUserId}`,
      req.ip || "127.0.0.1",
      req.headers["user-agent"] || "unknown"
    );

    res.json({ message: "Member removed from workspace" });
  } catch (err) {
    res.status(500).json({ message: "Error removing workspace member" });
  }
});

import { executeCascadingSoftDelete } from "../utils/cascadeDelete";

// DELETE /api/workspaces/:id - Soft delete workspace (Owner only)
workspacesRouter.delete("/:id", requireWorkspaceRole("Owner", "id"), async (req, res) => {
  try {
    const orgId = req.user?.organisationId;
    if (!orgId) return res.status(400).json({ message: "No organisation context" });

    await executeCascadingSoftDelete("Workspace", req.params.id, orgId.toString());

    await writeAuditLog(
      req.user!.id,
      "WORKSPACE_DELETE",
      `Workspace:${req.params.id}`,
      req.ip || "127.0.0.1",
      req.headers["user-agent"] || "unknown"
    );

    res.json({ message: "Workspace and all nested resources deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting workspace" });
  }
});
