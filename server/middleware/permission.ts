import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { WorkspaceMemberModel } from "../models";

const ROLE_HIERARCHY = ["Viewer", "Member", "Editor", "Admin", "Owner"];

export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
  orgRole: string,
  userOrgId?: string | null
): Promise<string> {
  let resolvedOrgId = userOrgId;
  
  // If userOrgId is not provided, look it up from User
  if (resolvedOrgId === undefined) {
    const user = await mongoose.model("User").findById(userId) as any;
    resolvedOrgId = user?.organisationId ? user.organisationId.toString() : null;
  }

  // Handle invalid ObjectIds and default workspace placeholder
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    if (workspaceId === "default-workspace-id") {
      try {
        const query: any = {};
        if (orgRole !== "Owner" && orgRole !== "Admin" && orgRole !== "Lead") {
          query.memberIds = userId;
        }
        if (resolvedOrgId) {
          query.organisationId = resolvedOrgId;
        }
        const workspace = await mongoose.model("Workspace").findOne(query) as any;
        if (workspace) {
          workspaceId = workspace._id.toString();
        } else {
          return "None";
        }
      } catch (err) {
        console.error("Error resolving default workspace in permissions:", err);
        return "None";
      }
    } else {
      return "None";
    }
  }

  // Fetch the workspace to verify it exists and belongs to the correct organisation
  const workspace = await mongoose.model("Workspace").findById(workspaceId) as any;
  if (!workspace || (resolvedOrgId && workspace.organisationId.toString() !== resolvedOrgId.toString())) {
    return "None"; // Cross-tenant leak prevention or not found
  }

  // Owner and Admin org-level roles have administrative permissions across all workspaces in their organisation
  if (orgRole === "Owner") return "Owner";
  if (orgRole === "Admin") return "Admin";

  const member = await WorkspaceMemberModel.findOne({ workspaceId, userId });
  if (member) return member.role;

  return "None"; // Default fallback (not a member)
}

export function requireWorkspaceRole(minRole: "Owner" | "Admin" | "Editor" | "Member" | "Viewer", paramName?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      const orgRole = req.user.role || "User";
      const userOrgId = req.user.organisationId;
      let workspaceId = paramName ? req.params[paramName] : (req.params.workspaceId || req.params.wsId || req.headers["x-workspace-id"] || req.body.workspaceId);

      if (!workspaceId) {
        return res.status(400).json({ message: "Workspace context (x-workspace-id header or route parameter) is required" });
      }

      if (Array.isArray(workspaceId)) {
        workspaceId = workspaceId[0];
      }

      const userRole = await getWorkspaceRole(userId, workspaceId as string, orgRole, userOrgId);
      
      const userLevel = ROLE_HIERARCHY.indexOf(userRole);
      const minLevel = ROLE_HIERARCHY.indexOf(minRole);

      if (userLevel >= minLevel) {
        (req as any).workspaceRole = userRole; // Attach resolved role for logging/logic
        return next();
      }

      return res.status(403).json({ message: `Forbidden: requires at least ${minRole} workspace role. Your role: ${userRole}` });
    } catch (error) {
      console.error("Workspace permission check failed:", error);
      return res.status(500).json({ message: "Internal server error during permission check" });
    }
  };
}
