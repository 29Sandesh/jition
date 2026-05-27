import { getWorkspaceRole } from "../middleware/permission";

export interface UserContext {
  id: string;
  role: string; // Org role: Owner | Admin | User | etc.
}

export interface ResourceContext {
  id?: string;
  assigneeIds?: string[];
  creatorId?: string;
  workspaceId?: string;
  [key: string]: any;
}

export interface EnvironmentContext {
  sprintActive?: boolean;
  workspaceTier?: "Free" | "Pro" | "Enterprise";
  [key: string]: any;
}

// Define workspace role levels
const ROLE_LEVELS: Record<string, number> = {
  None: 0,
  Viewer: 1,
  Member: 2,
  Editor: 3,
  Admin: 4,
  Owner: 5,
};

// Custom hybrid RBAC + ABAC engine
export async function evaluatePermission(
  user: UserContext,
  action: "view_task" | "create_task" | "edit_task" | "delete_task" | "manage_members",
  workspaceId: string,
  resource?: ResourceContext,
  env?: EnvironmentContext
): Promise<boolean> {
  // 1. Resolve Workspace Role (RBAC)
  const workspaceRole = await getWorkspaceRole(user.id, workspaceId, user.role);
  const userLevel = ROLE_LEVELS[workspaceRole] || 0;

  // 2. Evaluate RBAC rules
  if (userLevel === 0) return false; // Not a member of the workspace

  // Org Owners, Org Admins, and Workspace Owners/Admins bypass ABAC checks for admin tasks
  if (workspaceRole === "Owner" || workspaceRole === "Admin" || user.role === "Owner" || user.role === "Admin") {
    return true;
  }

  // 3. Evaluate Action-specific RBAC & ABAC rules
  switch (action) {
    case "view_task":
      return userLevel >= ROLE_LEVELS.Viewer;

    case "create_task":
      return userLevel >= ROLE_LEVELS.Editor;

    case "delete_task":
      // Only workspace admins or organization owners can delete tasks
      return userLevel >= ROLE_LEVELS.Admin;

    case "edit_task": {
      // Must be Editor or above, or if Member, evaluate ABAC rules
      if (userLevel < ROLE_LEVELS.Member) return false;

      // If Editor or above, check env rules (e.g. active sprint and tier locks)
      if (userLevel >= ROLE_LEVELS.Editor) {
        // e.g. If locked, require Pro tier
        if (env?.workspaceTier === "Free" && resource?.priority === "P0") {
          return false; // P0 editing locked on Free tier
        }
        return true;
      }

      // ABAC: A Member can only edit a task if they are the assignee AND the sprint is active AND the workspace tier is Pro
      if (resource && env) {
        const isAssignee = resource.assigneeIds?.includes(user.id) || resource.creatorId === user.id;
        const isSprintActive = env.sprintActive !== false; // Default to true if not specified
        const isProTier = env.workspaceTier === "Pro" || env.workspaceTier === "Enterprise";

        return isAssignee && isSprintActive && isProTier;
      }

      return false; // Fallback if context is missing for member edits
    }

    case "manage_members":
      return userLevel >= ROLE_LEVELS.Admin;

    default:
      return false;
  }
}
