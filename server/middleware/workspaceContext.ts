import { Request, Response, NextFunction } from "express";
import { WorkspaceModel } from "../models";

export async function requireWorkspaceContext(req: Request, res: Response, next: NextFunction) {
  let workspaceId = req.headers["x-workspace-id"];
  
  if (!workspaceId) {
    return res.status(400).json({ 
      message: "Missing x-workspace-id header. Workspace context is required for this operation." 
    });
  }

  // Resolve dummy frontend workspace ID to the user's actual workspace
  if (workspaceId === "default-workspace-id" && (req as any).user) {
    try {
      let workspace = await WorkspaceModel.findOne({ memberIds: (req as any).user.id });
      if (!workspace && ((req as any).user.role === "Owner" || (req as any).user.role === "Admin" || (req as any).user.role === "Lead")) {
        workspace = await WorkspaceModel.findOne({ organisationId: (req as any).user.organisationId });
      }
      if (workspace) {
        req.headers["x-workspace-id"] = workspace._id.toString();
      }
    } catch (e) {
      console.error("Failed to resolve default workspace", e);
    }
  }
  
  next();
}
