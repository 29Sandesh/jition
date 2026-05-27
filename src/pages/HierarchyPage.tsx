import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";
import { cn } from "../lib/utils";

// Define TypeScript interfaces for our 6 levels
interface Workspace {
  _id: string;
  name: string;
  description?: string;
  memberIds: string[];
}

interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  status: string;
}

interface Epic {
  _id: string;
  projectId: string;
  workspaceId: string;
  title: string;
}

interface Story {
  _id: string;
  epicId: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description?: string;
}

interface WorkItem {
  _id: string;
  storyId?: string;
  epicId?: string;
  projectId: string;
  workspaceId: string;
  title: string;
  status: "Todo" | "In Progress" | "Review" | "Done";
  priority: "P0" | "P1" | "P2" | "P3";
  assigneeIds: string[];
  creatorId: string;
  parentTaskId?: string | null;
  dueDate?: string;
  description?: string;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  orgRole: string;
  workspaceRole: string;
}

export function HierarchyPage() {
  const { user, organisation } = useAuth();
  
  // Data States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Record<string, Project[]>>({}); // wsId -> projects
  const [epics, setEpics] = useState<Record<string, Epic[]>>({}); // projId -> epics
  const [stories, setStories] = useState<Record<string, Story[]>>({}); // epicId -> stories
  const [tasks, setTasks] = useState<Record<string, WorkItem[]>>({}); // storyId -> tasks
  const [subtasks, setSubtasks] = useState<Record<string, WorkItem[]>>({}); // taskId -> subtasks
  const [members, setMembers] = useState<Record<string, WorkspaceMember[]>>({}); // wsId -> members
  const [workspaceRoles, setWorkspaceRoles] = useState<Record<string, string>>({}); // wsId -> current user's role

  // UI States
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<{ type: string; data: any } | null>(null);
  
  // Creation States
  const [showAddModal, setShowAddModal] = useState<{
    type: "workspace" | "project" | "epic" | "story" | "task" | "subtask";
    parentId: string;
  } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<"P0" | "P1" | "P2" | "P3">("P2");
  const [newItemStatus, setNewItemStatus] = useState<"Todo" | "In Progress" | "Review" | "Done">("Todo");
  const [newItemAssignee, setNewItemAssignee] = useState("");

  const orgId = organisation?.id || user?.organisationId || "";
  const authHeaders = {
    "x-organisation-id": orgId,
    "x-user-id": user?.id || "",
    "x-company-id": orgId
  };

  useEffect(() => {
    if (orgId) {
      fetchWorkspaces();
    }
  }, [orgId]);

  // Expand/Collapse togglers that trigger fetching of children
  const toggleNode = async (nodeId: string, type: string, parentId?: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
      setExpandedNodes(newExpanded);
    } else {
      newExpanded.add(nodeId);
      setExpandedNodes(newExpanded);
      // Fetch children if they aren't loaded yet
      await fetchChildren(nodeId, type, parentId);
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/api/workspaces", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        // Pre-resolve workspace roles
        data.forEach((ws: Workspace) => {
          fetchWorkspaceMembers(ws._id);
        });
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err);
      toast.error("Failed to load workspaces");
    }
  };

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => ({ ...prev, [workspaceId]: data }));
        
        // Find current user's role in this workspace
        const currentMember = data.find((m: any) => m._id === user?.id);
        if (currentMember) {
          setWorkspaceRoles(prev => ({ ...prev, [workspaceId]: currentMember.workspaceRole }));
        } else if (user?.role === "Owner" || user?.role === "Admin") {
          setWorkspaceRoles(prev => ({ ...prev, [workspaceId]: user.role }));
        } else {
          setWorkspaceRoles(prev => ({ ...prev, [workspaceId]: "Viewer" }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChildren = async (nodeId: string, type: string, parentId?: string) => {
    setLoadingNodes(prev => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });

    try {
      const headers = { ...authHeaders, "x-workspace-id": parentId || nodeId };

      if (type === "workspace") {
        // Fetch projects in workspace
        const res = await fetch(`/api/workspaces/${nodeId}/projects`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProjects(prev => ({ ...prev, [nodeId]: data }));
        }
      } else if (type === "project") {
        // Fetch epics in project
        const res = await fetch(`/api/projects/${nodeId}/epics`, { headers });
        if (res.ok) {
          const data = await res.json();
          setEpics(prev => ({ ...prev, [nodeId]: data }));
        }
      } else if (type === "epic") {
        // Fetch stories in epic
        const res = await fetch(`/api/epics/${nodeId}/stories`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStories(prev => ({ ...prev, [nodeId]: data }));
        }
      } else if (type === "story") {
        // Fetch tasks in story
        const res = await fetch(`/api/workItems/stories/${nodeId}/tasks`, { headers });
        if (res.ok) {
          const data = await res.json();
          setTasks(prev => ({ ...prev, [nodeId]: data }));
        }
      } else if (type === "task") {
        // Fetch subtasks under task
        const res = await fetch(`/api/workItems/tasks/${nodeId}/subtasks`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSubtasks(prev => ({ ...prev, [nodeId]: data }));
        }
      }
    } catch (err) {
      console.error(`Error loading children for ${type} ${nodeId}:`, err);
      toast.error(`Failed to load items`);
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  };

  // Helper check for role permission
  const hasPermission = (workspaceId: string, minRole: "Owner" | "Admin" | "Editor" | "Member" | "Viewer") => {
    if (user?.role === "Owner") return true; // Super admin bypass
    const userRole = workspaceRoles[workspaceId] || "Viewer";
    const roles = ["Viewer", "Member", "Editor", "Admin", "Owner"];
    return roles.indexOf(userRole) >= roles.indexOf(minRole);
  };

  // Create handlers
  const handleAddItem = async () => {
    if (!newItemName.trim() || !showAddModal) return;
    const { type, parentId } = showAddModal;

    try {
      let endpoint = "";
      let body: any = {};
      let headers: any = { "Content-Type": "application/json", ...authHeaders };

      if (type === "workspace") {
        endpoint = "/api/workspaces";
        body = { name: newItemName, description: newItemDescription };
      } else if (type === "project") {
        endpoint = `/api/workspaces/${parentId}/projects`;
        body = { name: newItemName, organisationId: orgId };
        headers["x-workspace-id"] = parentId;
      } else if (type === "epic") {
        // We need the project's workspace ID to authorize
        const wsId = workspaces.find(ws => projects[ws._id]?.some(p => p._id === parentId))?._id || "";
        endpoint = `/api/projects/${parentId}/epics`;
        body = { title: newItemName };
        headers["x-workspace-id"] = wsId;
      } else if (type === "story") {
        // Resolve project and workspace ID
        const epicObj = (Object.values(epics) as Epic[][]).reduce<Epic[]>((acc, val) => acc.concat(val), []).find(e => e._id === parentId);
        const wsId = epicObj?.workspaceId || "";
        endpoint = `/api/epics/${parentId}/stories`;
        body = { title: newItemName, description: newItemDescription };
        headers["x-workspace-id"] = wsId;
      } else if (type === "task") {
        const storyObj = (Object.values(stories) as Story[][]).reduce<Story[]>((acc, val) => acc.concat(val), []).find(s => s._id === parentId);
        const wsId = storyObj?.workspaceId || "";
        endpoint = `/api/workItems/stories/${parentId}/tasks`;
        body = {
          title: newItemName,
          description: newItemDescription,
          priority: newItemPriority,
          status: newItemStatus,
          assigneeIds: newItemAssignee ? [newItemAssignee] : [],
        };
        headers["x-workspace-id"] = wsId;
      } else if (type === "subtask") {
        const allTasks = (Object.values(tasks) as WorkItem[][]).reduce<WorkItem[]>((acc, val) => acc.concat(val), [])
          .concat((Object.values(subtasks) as WorkItem[][]).reduce<WorkItem[]>((acc, val) => acc.concat(val), []));
        const taskObj = allTasks.find(t => t._id === parentId);
        const wsId = taskObj?.workspaceId || "";
        endpoint = `/api/workItems/tasks/${parentId}/subtasks`;
        body = {
          title: newItemName,
          description: newItemDescription,
          priority: newItemPriority,
          status: newItemStatus,
          assigneeIds: newItemAssignee ? [newItemAssignee] : [],
          kind: "Chore"
        };
        headers["x-workspace-id"] = wsId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success(`Created ${type} successfully`);
        // Refresh specific parent list
        if (type === "workspace") {
          fetchWorkspaces();
        } else if (type === "project") {
          fetchChildren(parentId, "workspace");
        } else if (type === "epic") {
          fetchChildren(parentId, "project");
        } else if (type === "story") {
          fetchChildren(parentId, "epic");
        } else if (type === "task") {
          fetchChildren(parentId, "story");
        } else if (type === "subtask") {
          fetchChildren(parentId, "task");
        }

        // Reset
        setShowAddModal(null);
        setNewItemName("");
        setNewItemDescription("");
        setNewItemPriority("P2");
        setNewItemStatus("Todo");
        setNewItemAssignee("");
      } else {
        const err = await res.json();
        toast.error(err.message || `Failed to create ${type}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating item");
    }
  };

  // Change task status handler
  const handleStatusChange = async (task: WorkItem, newStatus: string) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...authHeaders,
        "x-workspace-id": task.workspaceId
      };
      const res = await fetch(`/api/workItems/${task._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success("Status updated");
        
        // Update state locally
        if (task.parentTaskId) {
          setSubtasks(prev => ({
            ...prev,
            [task.parentTaskId!]: prev[task.parentTaskId!]?.map(t => t._id === task._id ? { ...t, status: newStatus as any } : t) || []
          }));
        } else if (task.storyId) {
          setTasks(prev => ({
            ...prev,
            [task.storyId!]: prev[task.storyId!]?.map(t => t._id === task._id ? { ...t, status: newStatus as any } : t) || []
          }));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteItem = async (id: string, type: string, parentId?: string) => {
    if (user?.role !== "Owner" && user?.role !== "Admin") {
      toast.error("Only Owners and Admins can delete resources");
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${type}? This will delete all nested children as well!`)) {
      return;
    }

    try {
      let endpoint = "";
      if (type === "workspace") endpoint = `/api/workspaces/${id}`;
      else if (type === "project") endpoint = `/api/projects/${id}`;
      else if (type === "epic") endpoint = `/api/epics/${id}`;
      else if (type === "story") endpoint = `/api/stories/${id}`;
      else if (type === "task" || type === "subtask") endpoint = `/api/workItems/${id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: authHeaders
      });

      if (res.ok) {
        toast.success(`Deleted ${type} successfully`);
        // Refresh specific parent list
        if (type === "workspace") {
          fetchWorkspaces();
        } else if (type === "project") {
          fetchWorkspaces(); // refresh workspaces projects list
        } else if (type === "epic" && parentId) {
          fetchChildren(parentId, "project");
        } else if (type === "story" && parentId) {
          fetchChildren(parentId, "epic");
        } else if (type === "task" && parentId) {
          fetchChildren(parentId, "story");
        } else if (type === "subtask" && parentId) {
          fetchChildren(parentId, "task");
        }
        
        if (selectedItem?.data._id === id) {
          setSelectedItem(null);
        }
      } else {
        const err = await res.json();
        toast.error(err.message || `Failed to delete ${type}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error deleting ${type}`);
    }
  };

  return (
    <div className="flex h-screen bg-surface-container-lowest overflow-hidden">
      {/* Main Tree Explorer Panel */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar h-full pb-20">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-outline-variant/30 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">{organisation?.name || "Organisation"}</span>
              <span className="text-label-sm text-outline">Multi-tenant hierarchy</span>
            </div>
            <h1 className="text-headline-xl font-headline-xl text-on-surface tracking-tight">Hierarchy Explorer</h1>
            <p className="text-body-md text-on-surface-variant">Navigate and manage levels from Workspace down to Sub-task.</p>
          </div>

          {(user?.role === "Owner" || user?.role === "Admin") && (
            <button 
              onClick={() => setShowAddModal({ type: "workspace", parentId: "" })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-label-md rounded-lg shadow-sm hover:shadow transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Workspace
            </button>
          )}
        </div>

        {/* Tree Container */}
        <div className="space-y-4 max-w-[900px] w-full mx-auto">
          {workspaces.map(ws => {
            const isWsExpanded = expandedNodes.has(ws._id);
            const wsProjects = projects[ws._id] || [];
            const wsMembers = members[ws._id] || [];
            const userRole = workspaceRoles[ws._id] || "Viewer";

            return (
              <div key={ws._id} className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
                
                {/* Level 2: Workspace Row */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-medium/70 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                      onClick={() => toggleNode(ws._id, "workspace")}
                      className="p-1 rounded hover:bg-black/5 flex items-center justify-center"
                    >
                      <span className={cn("material-symbols-outlined transition-transform text-outline", isWsExpanded && "rotate-90")}>
                        chevron_right
                      </span>
                    </button>
                    
                    <span className="material-symbols-outlined text-primary text-[22px] shrink-0">workspaces</span>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 
                          onClick={() => setSelectedItem({ type: "Workspace", data: ws })}
                          className="font-bold text-body-lg text-on-surface cursor-pointer hover:underline truncate"
                        >
                          {ws.name}
                        </h3>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container">
                          {userRole}
                        </span>
                      </div>
                      <p className="text-label-sm text-outline-variant truncate max-w-[400px]">{ws.description || "No description"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Member Count Badge */}
                    <span className="flex items-center gap-1 text-[11px] text-on-surface-variant font-bold bg-surface-container-high px-2 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[13px]">group</span>
                      {ws.memberIds.length} Members
                    </span>

                    {hasPermission(ws._id, "Admin") && (
                      <button 
                        onClick={() => setShowAddModal({ type: "project", parentId: ws._id })}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/5 flex items-center justify-center animate-fade-in"
                        title="Add Project"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        <span className="text-label-sm font-bold ml-1">Project</span>
                      </button>
                    )}

                    {(user?.role === "Owner" || user?.role === "Admin") && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(ws._id, "workspace"); }}
                        className="p-1.5 rounded-lg text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                        title="Delete Workspace"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Workspace children (Projects) */}
                {isWsExpanded && (
                  <div className="border-t border-outline-variant/30 bg-surface-container-lowest divide-y divide-outline-variant/20">
                    {loadingNodes.has(ws._id) && (
                      <div className="p-4 text-center text-label-sm text-outline animate-pulse">Loading Projects...</div>
                    )}
                    {wsProjects.length === 0 && !loadingNodes.has(ws._id) && (
                      <div className="p-4 text-center text-label-sm text-outline opacity-50 italic">No projects found. Add one to get started.</div>
                    )}
                    {wsProjects.map(proj => {
                      const isProjExpanded = expandedNodes.has(proj._id);
                      const projEpics = epics[proj._id] || [];

                      return (
                        <div key={proj._id} className="pl-6">
                          
                          {/* Level 3: Project Row */}
                          <div className="flex items-center justify-between py-3 pr-4 border-b border-outline-variant/20 hover:bg-black/[0.01]">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button 
                                onClick={() => toggleNode(proj._id, "project", ws._id)}
                                className="p-1 rounded hover:bg-black/5 flex items-center justify-center"
                              >
                                <span className={cn("material-symbols-outlined transition-transform text-outline text-[18px]", isProjExpanded && "rotate-90")}>
                                  chevron_right
                                </span>
                              </button>
                              
                              <span className="material-symbols-outlined text-success text-[20px] shrink-0">folder</span>
                              
                              <h4 
                                onClick={() => setSelectedItem({ type: "Project", data: proj })}
                                className="font-bold text-body-md text-on-surface cursor-pointer hover:underline truncate"
                              >
                                {proj.name}
                              </h4>
                            </div>

                            {hasPermission(ws._id, "Editor") && (
                              <button 
                                onClick={() => setShowAddModal({ type: "epic", parentId: proj._id })}
                                className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                title="Add Epic"
                              >
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                <span className="text-label-sm font-bold ml-0.5">Epic</span>
                              </button>
                            )}

                            {(user?.role === "Owner" || user?.role === "Admin") && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(proj._id, "project", ws._id); }}
                                className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                                title="Delete Project"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>

                          {/* Project children (Epics) */}
                          {isProjExpanded && (
                            <div className="pl-6 bg-black/[0.005]">
                              {loadingNodes.has(proj._id) && (
                                <div className="py-2 text-label-sm text-outline animate-pulse">Loading Epics...</div>
                              )}
                              {projEpics.length === 0 && !loadingNodes.has(proj._id) && (
                                <div className="py-3 text-label-sm text-outline opacity-50 italic">No epics in this project.</div>
                              )}
                              {projEpics.map(epic => {
                                const isEpicExpanded = expandedNodes.has(epic._id);
                                const epicStories = stories[epic._id] || [];

                                return (
                                  <div key={epic._id}>
                                    
                                    {/* Level 4: Epic Row */}
                                    <div className="flex items-center justify-between py-2.5 pr-4 border-b border-outline-variant/10 hover:bg-black/[0.01]">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <button 
                                          onClick={() => toggleNode(epic._id, "epic", ws._id)}
                                          className="p-0.5 rounded hover:bg-black/5 flex items-center justify-center"
                                        >
                                          <span className={cn("material-symbols-outlined transition-transform text-outline text-[16px]", isEpicExpanded && "rotate-90")}>
                                            chevron_right
                                          </span>
                                        </button>
                                        
                                        <span className="material-symbols-outlined text-warning text-[18px] shrink-0 font-fill">bolt</span>
                                        
                                        <span className="text-[10px] bg-warning/10 text-warning px-1.5 rounded font-bold shrink-0">EPIC</span>
                                        
                                        <h5 
                                          onClick={() => setSelectedItem({ type: "Epic", data: epic })}
                                          className="font-semibold text-body-md text-on-surface cursor-pointer hover:underline truncate"
                                        >
                                          {epic.title}
                                        </h5>
                                      </div>

                                      {hasPermission(ws._id, "Editor") && (
                                        <button 
                                          onClick={() => setShowAddModal({ type: "story", parentId: epic._id })}
                                          className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                          title="Add Story"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">add</span>
                                          <span className="text-label-sm font-bold ml-0.5">Story</span>
                                        </button>
                                      )}

                                      {(user?.role === "Owner" || user?.role === "Admin") && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(epic._id, "epic", proj._id); }}
                                          className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                                          title="Delete Epic"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Epic children (Stories) */}
                                    {isEpicExpanded && (
                                      <div className="pl-6 bg-black/[0.005]">
                                        {loadingNodes.has(epic._id) && (
                                          <div className="py-2 text-label-sm text-outline animate-pulse">Loading Stories...</div>
                                        )}
                                        {epicStories.length === 0 && !loadingNodes.has(epic._id) && (
                                          <div className="py-2 text-label-sm text-outline opacity-50 italic">No stories in this epic.</div>
                                        )}
                                        {epicStories.map(story => {
                                          const isStoryExpanded = expandedNodes.has(story._id);
                                          const storyTasks = tasks[story._id] || [];

                                          return (
                                            <div key={story._id}>
                                              
                                              {/* Level 5: Story Row */}
                                              <div className="flex items-center justify-between py-2 pr-4 border-b border-outline-variant/10 hover:bg-black/[0.01]">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <button 
                                                    onClick={() => toggleNode(story._id, "story", ws._id)}
                                                    className="p-0.5 rounded hover:bg-black/5 flex items-center justify-center"
                                                  >
                                                    <span className={cn("material-symbols-outlined transition-transform text-outline text-[16px]", isStoryExpanded && "rotate-90")}>
                                                      chevron_right
                                                    </span>
                                                  </button>
                                                  
                                                  <span className="material-symbols-outlined text-info text-[18px] shrink-0">bookmark</span>
                                                  <span className="text-[10px] bg-info/10 text-info px-1.5 rounded font-bold shrink-0">STORY</span>
                                                  
                                                  <h6 
                                                    onClick={() => setSelectedItem({ type: "Story", data: story })}
                                                    className="font-semibold text-body-md text-on-surface cursor-pointer hover:underline truncate"
                                                  >
                                                    {story.title}
                                                  </h6>
                                                </div>

                                                {hasPermission(ws._id, "Editor") && (
                                                  <button 
                                                    onClick={() => setShowAddModal({ type: "task", parentId: story._id })}
                                                    className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                                    title="Add Task"
                                                  >
                                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                                    <span className="text-label-sm font-bold ml-0.5">Task</span>
                                                  </button>
                                                )}
                                                 {(user?.role === "Owner" || user?.role === "Admin") && (
                                                   <button 
                                                     onClick={(e) => { e.stopPropagation(); handleDeleteItem(story._id, "story", epic._id); }}
                                                     className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                                                     title="Delete Story"
                                                   >
                                                     <span className="material-symbols-outlined text-[16px]">delete</span>
                                                   </button>
                                                 )}
                                              </div>

                                              {/* Story children (Tasks) */}
                                              {isStoryExpanded && (
                                                <div className="pl-6 bg-black/[0.005]">
                                                  {loadingNodes.has(story._id) && (
                                                    <div className="py-2 text-label-sm text-outline animate-pulse">Loading Tasks...</div>
                                                  )}
                                                  {storyTasks.length === 0 && !loadingNodes.has(story._id) && (
                                                    <div className="py-2 text-label-sm text-outline opacity-50 italic">No tasks in this story.</div>
                                                  )}
                                                  {storyTasks.map(task => {
                                                    const isTaskExpanded = expandedNodes.has(task._id);
                                                    const taskSubtasks = subtasks[task._id] || [];
                                                    const assignedMember = wsMembers.find(m => task.assigneeIds.includes(m._id));

                                                    return (
                                                      <div key={task._id}>
                                                        
                                                        {/* Level 6: Task Row */}
                                                        <div className="flex items-center justify-between py-1.5 pr-4 border-b border-outline-variant/10 hover:bg-black/[0.01]">
                                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <button 
                                                              onClick={() => toggleNode(task._id, "task", ws._id)}
                                                              className="p-0.5 rounded hover:bg-black/5 flex items-center justify-center"
                                                            >
                                                              <span className={cn("material-symbols-outlined transition-transform text-outline text-[14px]", isTaskExpanded && "rotate-90")}>
                                                                chevron_right
                                                              </span>
                                                            </button>
                                                            
                                                            <span className="material-symbols-outlined text-outline text-[16px] shrink-0">assignment</span>
                                                            
                                                            <span 
                                                              onClick={() => setSelectedItem({ type: "Task", data: task })}
                                                              className="font-medium text-body-md text-on-surface cursor-pointer hover:underline truncate"
                                                            >
                                                              {task.title}
                                                            </span>

                                                            {/* Priority Badge */}
                                                            <span className={cn(
                                                              "text-[9px] font-bold px-1 py-0.5 rounded shrink-0",
                                                              task.priority === "P0" && "bg-error/10 text-error",
                                                              task.priority === "P1" && "bg-amber-600/10 text-amber-600",
                                                              task.priority === "P2" && "bg-primary/10 text-primary",
                                                              task.priority === "P3" && "bg-outline-variant text-outline"
                                                            )}>
                                                              {task.priority}
                                                            </span>

                                                            {/* Assignee Badge */}
                                                            {assignedMember && (
                                                              <span className="text-[10px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded flex items-center gap-1 font-medium shrink-0">
                                                                <span className="w-3.5 h-3.5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[8px]">
                                                                  {assignedMember.name.substring(0, 1)}
                                                                </span>
                                                                {assignedMember.name}
                                                              </span>
                                                            )}
                                                          </div>

                                                          <div className="flex items-center gap-2">
                                                            {/* Status Selector Dropdown */}
                                                            <select
                                                              value={task.status}
                                                              onChange={(e) => handleStatusChange(task, e.target.value)}
                                                              disabled={!hasPermission(ws._id, "Editor")}
                                                              className={cn(
                                                                "text-[11px] font-bold rounded border py-0.5 px-2 bg-transparent focus:outline-none cursor-pointer",
                                                                task.status === "Done" && "border-success text-success",
                                                                task.status === "Review" && "border-tertiary text-tertiary",
                                                                task.status === "In Progress" && "border-primary text-primary",
                                                                task.status === "Todo" && "border-outline text-outline"
                                                              )}
                                                            >
                                                              <option value="Todo">Todo</option>
                                                              <option value="In Progress">In Progress</option>
                                                              <option value="Review">Review</option>
                                                              <option value="Done">Done</option>
                                                            </select>

                                                            {hasPermission(ws._id, "Editor") && (
                                                              <button 
                                                                onClick={() => setShowAddModal({ type: "subtask", parentId: task._id })}
                                                                className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                                                title="Add Sub-task"
                                                              >
                                                                <span className="material-symbols-outlined text-[14px]">add</span>
                                                              </button>
                                                            )}

                                                            {(user?.role === "Owner" || user?.role === "Admin") && (
                                                              <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(task._id, "task", story._id); }}
                                                                className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                                                                title="Delete Task"
                                                              >
                                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                              </button>
                                                            )}
                                                          </div>
                                                        </div>

                                                        {/* Task children (Sub-tasks) */}
                                                        {isTaskExpanded && (
                                                          <div className="pl-6 bg-black/[0.005]">
                                                            {loadingNodes.has(task._id) && (
                                                              <div className="py-1 text-label-sm text-outline animate-pulse">Loading Sub-tasks...</div>
                                                            )}
                                                            {taskSubtasks.length === 0 && !loadingNodes.has(task._id) && (
                                                              <div className="py-1.5 text-label-sm text-outline opacity-50 italic">No sub-tasks.</div>
                                                            )}
                                                            {taskSubtasks.map(sub => {
                                                              const subAssignee = wsMembers.find(m => sub.assigneeIds.includes(m._id));
                                                              return (
                                                                <div 
                                                                  key={sub._id}
                                                                  className="flex items-center justify-between py-1 border-b border-outline-variant/10 pl-6 hover:bg-black/[0.01]"
                                                                >
                                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <span className="material-symbols-outlined text-outline-variant text-[14px]">subdirectory_arrow_right</span>
                                                                    <span 
                                                                      onClick={() => setSelectedItem({ type: "Sub-task", data: sub })}
                                                                      className="text-body-md text-on-surface-variant cursor-pointer hover:underline truncate"
                                                                    >
                                                                      {sub.title}
                                                                    </span>

                                                                    {subAssignee && (
                                                                      <span className="text-[9px] text-on-surface-variant bg-surface-container-high px-1 py-0.5 rounded flex items-center gap-1 font-medium shrink-0">
                                                                        {subAssignee.name}
                                                                      </span>
                                                                    )}
                                                                  </div>

                                                                  <div className="flex items-center gap-2">
                                                                    {(user?.role === "Owner" || user?.role === "Admin") && (
                                                                      <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(sub._id, "subtask", task._id); }}
                                                                        className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors"
                                                                        title="Delete Sub-task"
                                                                      >
                                                                        <span className="material-symbols-outlined text-[12px]">delete</span>
                                                                      </button>
                                                                    )}
                                                                    <select
                                                                      value={sub.status}
                                                                      onChange={(e) => handleStatusChange(sub, e.target.value)}
                                                                      disabled={!hasPermission(ws._id, "Editor")}
                                                                      className={cn(
                                                                        "text-[9px] font-bold rounded border py-0.5 px-1 bg-transparent focus:outline-none cursor-pointer",
                                                                        sub.status === "Done" && "border-success text-success",
                                                                        sub.status === "Review" && "border-tertiary text-tertiary",
                                                                        sub.status === "In Progress" && "border-primary text-primary",
                                                                        sub.status === "Todo" && "border-outline text-outline"
                                                                      )}
                                                                    >
                                                                      <option value="Todo">Todo</option>
                                                                      <option value="In Progress">In Progress</option>
                                                                      <option value="Review">Review</option>
                                                                      <option value="Done">Done</option>
                                                                    </select>
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Detail Panel (Drawer) */}
      {selectedItem && (
        <div className="w-[350px] border-l border-outline-variant bg-white h-full flex flex-col z-10 shadow-lg animate-slide-in">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <div>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                {selectedItem.type} Details
              </span>
              <h2 className="text-title-lg font-bold text-on-surface mt-1 truncate max-w-[200px]">
                {selectedItem.data.name || selectedItem.data.title}
              </h2>
            </div>
            <button 
              onClick={() => setSelectedItem(null)}
              className="p-1 rounded hover:bg-black/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-outline">close</span>
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div>
              <label className="text-label-sm font-bold text-outline block mb-1">ID</label>
              <p className="text-body-md font-mono bg-surface-container-high px-2 py-1 rounded text-on-surface truncate">
                {selectedItem.data._id}
              </p>
            </div>

            {selectedItem.data.description && (
              <div>
                <label className="text-label-sm font-bold text-outline block mb-1">Description</label>
                <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border p-3 rounded-lg leading-relaxed">
                  {selectedItem.data.description}
                </p>
              </div>
            )}

            {/* Render hierarchy connections */}
            <div className="space-y-3">
              <label className="text-label-sm font-bold text-outline block border-b pb-1">Relations</label>
              
              {selectedItem.data.workspaceId && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-outline">Workspace:</span>
                  <span className="font-semibold text-on-surface truncate max-w-[180px]">
                    {workspaces.find(w => w._id === selectedItem.data.workspaceId.toString())?.name || selectedItem.data.workspaceId}
                  </span>
                </div>
              )}

              {selectedItem.data.projectId && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-outline">Project ID:</span>
                  <span className="font-mono text-on-surface select-all text-xs truncate max-w-[180px]">
                    {selectedItem.data.projectId}
                  </span>
                </div>
              )}

              {selectedItem.data.epicId && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-outline">Epic ID:</span>
                  <span className="font-mono text-on-surface select-all text-xs truncate max-w-[180px]">
                    {selectedItem.data.epicId}
                  </span>
                </div>
              )}

              {selectedItem.data.storyId && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-outline">Story ID:</span>
                  <span className="font-mono text-on-surface select-all text-xs truncate max-w-[180px]">
                    {selectedItem.data.storyId}
                  </span>
                </div>
              )}
            </div>

            {selectedItem.data.priority && (
              <div className="flex justify-between items-center text-body-sm border-t pt-4">
                <span className="text-outline font-bold">Priority:</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded",
                  selectedItem.data.priority === "P0" && "bg-error/10 text-error",
                  selectedItem.data.priority === "P1" && "bg-amber-600/10 text-amber-600",
                  selectedItem.data.priority === "P2" && "bg-primary/10 text-primary",
                  selectedItem.data.priority === "P3" && "bg-outline-variant text-outline"
                )}>
                  {selectedItem.data.priority}
                </span>
              </div>
            )}

            {selectedItem.data.status && (
              <div className="flex justify-between items-center text-body-sm border-t pt-4">
                <span className="text-outline font-bold">Status:</span>
                <span className={cn(
                  "font-bold border px-2 py-0.5 rounded",
                  selectedItem.data.status === "Done" && "border-success text-success bg-success/5",
                  selectedItem.data.status === "Review" && "border-tertiary text-tertiary bg-tertiary/5",
                  selectedItem.data.status === "In Progress" && "border-primary text-primary bg-primary/5",
                  selectedItem.data.status === "Todo" && "border-outline text-outline bg-outline/5"
                )}>
                  {selectedItem.data.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation Popup Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 animate-scale-up">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-title-lg font-bold text-on-surface capitalize">
                Add New {showAddModal.type}
              </h3>
              <button 
                onClick={() => setShowAddModal(null)} 
                className="p-1 rounded hover:bg-black/5 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-label-sm font-bold text-on-surface-variant block mb-1">
                  Name / Title
                </label>
                <input 
                  type="text" 
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder={`Enter ${showAddModal.type} title...`}
                  className="w-full border border-outline-variant rounded-lg p-2.5 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface"
                />
              </div>

              {(showAddModal.type === "workspace" || showAddModal.type === "story" || showAddModal.type === "task" || showAddModal.type === "subtask") && (
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">
                    Description
                  </label>
                  <textarea 
                    value={newItemDescription}
                    onChange={e => setNewItemDescription(e.target.value)}
                    placeholder="Enter details..."
                    className="w-full border border-outline-variant rounded-lg p-2.5 bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary text-body-md text-on-surface h-20 resize-none"
                  />
                </div>
              )}

              {(showAddModal.type === "task" || showAddModal.type === "subtask") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label-sm font-bold text-on-surface-variant block mb-1">
                      Priority
                    </label>
                    <select 
                      value={newItemPriority}
                      onChange={e => setNewItemPriority(e.target.value as any)}
                      className="w-full border border-outline-variant rounded-lg p-2 bg-surface-container-lowest text-body-md"
                    >
                      <option value="P0">P0 (Critical)</option>
                      <option value="P1">P1 (High)</option>
                      <option value="P2">P2 (Medium)</option>
                      <option value="P3">P3 (Low)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label-sm font-bold text-on-surface-variant block mb-1">
                      Status
                    </label>
                    <select 
                      value={newItemStatus}
                      onChange={e => setNewItemStatus(e.target.value as any)}
                      className="w-full border border-outline-variant rounded-lg p-2 bg-surface-container-lowest text-body-md"
                    >
                      <option value="Todo">Todo</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
              )}

              {(showAddModal.type === "task" || showAddModal.type === "subtask") && (
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant block mb-1">
                    Assignee
                  </label>
                  <select 
                    value={newItemAssignee}
                    onChange={e => setNewItemAssignee(e.target.value)}
                    className="w-full border border-outline-variant rounded-lg p-2 bg-surface-container-lowest text-body-md text-on-surface"
                  >
                    <option value="">Select Assignee...</option>
                    {/* Populate members for parent workspace */}
                    {(Object.values(members) as WorkspaceMember[][]).reduce<WorkspaceMember[]>((acc, val) => acc.concat(val), []).map(member => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button 
                onClick={() => setShowAddModal(null)}
                className="px-4 py-2 border rounded-lg font-bold text-label-md text-on-surface hover:bg-black/5"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddItem}
                className="px-4 py-2 bg-primary text-white font-bold text-label-md rounded-lg shadow-sm hover:shadow"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
