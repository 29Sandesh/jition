# Security & Architecture Audit Report and Overhaul Implementation Plan

We have performed a complete scan of the JITION codebase. While the core features build successfully, we identified several critical security vulnerabilities and architectural gaps that leak tenant data and allow authentication bypasses.

---

## Security Audit Findings

### 🚨 1. Critical Authentication Bypass on Password Change (`/api/auth/change-password`)
* **Vulnerability**: The route is not protected by the `requireAuth` middleware. It reads the user ID from `req.headers["x-user-id"]` directly.
* **Impact**: Any user or attacker can change the password of any other user in the database simply by sending a request with the target's user ID in the headers.

### 🚨 2. Insecure Default Workspace Access Role (BOLA / IDOR)
* **Vulnerability**: In `server/middleware/permission.ts`, the `getWorkspaceRole` function returns `"Viewer"` as a default fallback for non-members of a workspace. Furthermore, Organisation Owners and Admins are granted workspace Owner/Admin rights across **all** workspaces in the database, without verifying that the workspace belongs to their organisation.
* **Impact**: Any authenticated user can view all projects, epics, stories, and tasks of *any* workspace (even those belonging to other companies/organisations) by passing that workspace's ID. An Org Owner of Company A can administer workspaces in Company B.

### 🚨 3. Unauthenticated Dashboard Metrics Leak
* **Vulnerability**: `/api/dashboard/summary` and `/api/dashboard/activities` do not require authentication. They perform global `TaskModel.find()` and `ActivityModel.find()` queries across the database without filtering by organisation or workspace.
* **Impact**: Anyone can view aggregate task metrics and active task lists for all tenants in the system.

### 🚨 4. Spoofable Chat API
* **Vulnerability**: `/api/chat/*` routes do not mount `requireAuth` and determine the logged-in user and company via headers (`x-user-id` and `x-company-id`).
* **Impact**: An attacker can spoof these headers to view private conversation histories or send messages as other users.

### 🚨 5. Schema Mismatch & Stale Models
* **Vulnerability**: The Chat and Dashboard routes still import and modify models from `server/models/old_schema.ts` (`OldUser`, `OldTask`, `OldConversation`, `OldMessage`). The rest of the app uses the new `User`, `WorkItem` (Bug/Feature/Chore/Spike), `Conversation`, and `Message` models.
* **Impact**: Stale schemas cause data splits, making chat and dashboard updates completely disconnected from the actual workspaces and users.

---

## Proposed Changes

We will systematically remediate these issues in a single contiguous execution phase.

### 1. Permissions & Access Control Layer

#### [MODIFY] [permission.ts](file:///c:/Users/sande/OneDrive/Desktop/JITION/server/middleware/permission.ts)
* Change `getWorkspaceRole` to require the user's `organisationId` and verify it matches the workspace's `organisationId`.
* Return `"None"` instead of `"Viewer"` if a user is not a member and has no administrative rights in that organisation.
* Block cross-tenant access for Org Owners and Admins.

```typescript
export async function getWorkspaceRole(userId: string, workspaceId: string, orgRole: string, userOrgId: string | null): Promise<string> {
  // 1. Resolve workspace and check tenant matching
  const workspace = await mongoose.model("Workspace").findById(workspaceId);
  if (!workspace || workspace.organisationId.toString() !== userOrgId?.toString()) {
    return "None"; // Tenant boundary or not found
  }

  // 2. Org-level administrators only have rights within their own organisation
  if (orgRole === "Owner") return "Owner";
  if (orgRole === "Admin") return "Admin";

  // 3. Check explicit workspace membership role
  const member = await WorkspaceMemberModel.findOne({ workspaceId, userId });
  if (member) return member.role;

  return "None";
}
```

---

### 2. Routes & Authentication Alignment

#### [MODIFY] [auth.ts](file:///c:/Users/sande/OneDrive/Desktop/JITION/server/routes/auth.ts)
* Mount the `requireAuth` middleware on the `/change-password` endpoint.
* Retrieve the current user's ID via `req.user.id` instead of checking the header `x-user-id`.

#### [MODIFY] [chat.ts](file:///c:/Users/sande/OneDrive/Desktop/JITION/server/routes/chat.ts)
* Replace header extraction with `req.user`. Mount `requireAuth` middleware.
* Migrate to new Models: `ConversationModel` from `models/Conversation` and `MessageModel` from `models/Message`.
* Convert custom mock string IDs (e.g. `CONV-xxx`) to MongoDB `ObjectId` types.

#### [MODIFY] [dashboard.ts](file:///c:/Users/sande/OneDrive/Desktop/JITION/server/routes/dashboard.ts)
* Mount `requireAuth` middleware.
* Migrate queries from `TaskModel` / `ActivityModel` (legacy) to `WorkItemModel` / `ActivityModel` (new schema).
* Scope queries by the user's `organisationId` and current active `x-workspace-id` header to ensure total tenant isolation.

---

### 3. Cleanup & Integration

#### [MODIFY] [index.ts](file:///c:/Users/sande/OneDrive/Desktop/JITION/server/index.ts)
* Re-enable the Apollo Server GraphQL endpoints under authentication protection.

#### [DELETE] Stale Code files
* Once routes are migrated, delete:
  * `server/models/old_schema.ts`
  * `server/routes/tasks.ts`
  * `server/routes/companies.ts`

---

### 4. Priority Color Contrast Fixes

#### [MODIFY] [Tasks.tsx](file:///c:/Users/sande/OneDrive/Desktop/JITION/src/pages/Tasks.tsx)
* Update priority classes to use high-contrast theme variables:
  * **P0 (Critical)**: `text-error` (Red dot/label)
  * **P1 (High)**: `text-amber-600` (Orange/Amber dot/label)
  * **P2 (Normal)**: `text-primary` (Blue/Primary dot/label)
  * **P3 (Low)**: `text-on-surface-variant` (Legible gray dot/label)

---

## Verification Plan

### Automated Checks
* Run `npm run lint` (`tsc --noEmit`) to verify zero compile or import errors.
* Validate starting the server in development mode (`npm run dev`).

### Manual Security Verification
1. **Password Bypass Check**: Test calling `/api/auth/change-password` without cookies/headers and verify it returns `401 Unauthorized`.
2. **Tenant Boundary Leak Check**: Log in as a user from Organisation A and attempt to request a Workspace ID belonging to Organisation B via `GET /api/workspaces/:wsId/projects` or `/api/workItems`. Verify it returns `403 Forbidden` / `404 Not Found`.
3. **Dashboard / Chat Leak Check**: Verify these routes block requests without authentication.
4. **Contrast Check**: View the Kanban board and check that P2/P3 priorities are clearly readable.
