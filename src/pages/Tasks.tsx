import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { useTasks, useUpdateTaskStatus, bindSocketToQueryCache } from "../lib/query";
import { io } from "socket.io-client";
import { useStore } from "../lib/store";

interface Task {
  _id: string;
  title: string;
  status: "Todo" | "In Progress" | "Review" | "Done";
  priority: "P0" | "P1" | "P2" | "P3";
  assigneeIds: string[];
  viewAccess: string[];
  editAccess: string[];
  dueDate?: string;
  description?: string;
  workspaceId: string;
  projectId: string;
  epicId?: string;
  storyId?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: "text-error",
  P1: "text-amber-600",
  P2: "text-primary",
  P3: "text-on-surface-variant",
};

const PRIORITY_BGS: Record<string, string> = {
  P0: "bg-error",
  P1: "bg-amber-600",
  P2: "bg-primary",
  P3: "bg-on-surface-variant",
};

export function Tasks() {
  const { user, organisation } = useAuth();
  
  // Columns state for reordering
  const [columns, setColumns] = useState<string[]>(["Todo", "In Progress", "Review", "Done"]);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  // Multi-select and Dragging States
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [draggedTaskIds, setDraggedTaskIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Hierarchy context selectors
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);

  const { 
    selectedWsId: storeWsId, 
    setSelectedWsId, 
    selectedProjectId: storeProjectId, 
    setSelectedProjectId 
  } = useStore();
  const selectedWsId = storeWsId || "";
  const selectedProjectId = storeProjectId || "";
  const [selectedEpicId, setSelectedEpicId] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState("");

  const [wsRole, setWsRole] = useState("Viewer");
  const canEditWorkspace = ["Owner", "Admin", "Editor", "Member"].includes(wsRole) || user?.role === "Owner";
  const [view, setView] = useState<"list" | "grid">("grid");

  const [aiSummary, setAiSummary] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  const orgId = organisation?.id || user?.organisationId || "";
  const authHeaders = {
    "x-workspace-id": selectedWsId || "default-workspace-id",
    "x-organisation-id": orgId,
    "x-user-id": user?.id || "",
    "x-company-id": orgId,
  };

  // TanStack Query v5 state integration
  const { data: fetchedTasks = [], refetch: fetchTasks } = useTasks(selectedWsId, authHeaders);
  const updateStatusMutation = useUpdateTaskStatus(selectedWsId, authHeaders);

  // 1. Connect Socket.io client for real-time cache mutations
  useEffect(() => {
    if (!selectedWsId) return;

    const socket = io("http://localhost:3000", {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.emit("join-workspace", selectedWsId);
    
    // Bind WebSocket events to query cache manually (no full-re-fetches)
    bindSocketToQueryCache(socket, selectedWsId);

    return () => {
      socket.emit("leave-workspace", selectedWsId);
      socket.disconnect();
    };
  }, [selectedWsId]);

  // Load Workspaces on mount
  useEffect(() => {
    if (orgId) {
      fetch("/api/workspaces", { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setWorkspaces(data);
            const currentWsIsValid = data.some(ws => ws._id === storeWsId);
            if (!storeWsId || !currentWsIsValid) {
              setSelectedWsId(data[0]._id);
            }
          }
        })
        .catch(console.error);
    }
  }, [orgId, storeWsId]);

  // Load Projects when workspace changes
  useEffect(() => {
    if (selectedWsId) {
      setSelectedProjectId("");
      setSelectedEpicId("");
      setSelectedStoryId("");
      setProjects([]);
      setEpics([]);
      setStories([]);

      fetchWorkspaceRole();
      fetch(`/api/workspaces/${selectedWsId}/projects`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProjects(data);
        })
        .catch(console.error);
    }
  }, [selectedWsId]);

  // Load Epics when Project changes
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedEpicId("");
      setSelectedStoryId("");
      setEpics([]);
      setStories([]);

      fetch(`/api/projects/${selectedProjectId}/epics`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setEpics(data);
        })
        .catch(console.error);
    } else {
      setSelectedEpicId("");
      setSelectedStoryId("");
      setEpics([]);
      setStories([]);
    }
  }, [selectedProjectId]);

  // Load Stories when Epic changes
  useEffect(() => {
    if (selectedEpicId) {
      setSelectedStoryId("");
      setStories([]);

      fetch(`/api/epics/${selectedEpicId}/stories`, { headers: authHeaders })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setStories(data);
        })
        .catch(console.error);
    } else {
      setSelectedStoryId("");
      setStories([]);
    }
  }, [selectedEpicId]);

  // Handle PWA Share Target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new" && projects.length > 0 && canEditWorkspace) {
      const title = params.get("title") || "Shared Content";
      const text = params.get("text") || "";
      const url = params.get("url") || "";
      
      const fullDescription = `${text}\n\nSource: ${url}`.trim();
      
      handleInlineAdd(title, "Todo", fullDescription).then(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, [projects, canEditWorkspace]);

  // AI Summariser SSE connection
  useEffect(() => {
    if (!selectedTask) return;
    
    setAiSummary("");
    setIsSummarizing(false);
    
    const eventSource = new EventSource(`/api/chat/tasks/${selectedTask._id}/stream-summary`, { withCredentials: true });
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "connected") return;
        if (data.done) {
          setIsSummarizing(false);
          return;
        }
        if (data.content) {
          setAiSummary((prev) => prev + data.content);
          setIsSummarizing(true);
        }
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, [selectedTask]);

  const handleTriggerSummary = async () => {
    if (!selectedTask) return;
    setIsSummarizing(true);
    setAiSummary("");
    try {
      await fetch(`/api/chat/tasks/${selectedTask._id}/trigger-summary`, {
        method: "POST",
        headers: authHeaders,
        credentials: "include"
      });
    } catch (err) {
      toast.error("Failed to trigger summary");
      setIsSummarizing(false);
    }
  };

  const fetchWorkspaceRole = async () => {
    try {
      const res = await fetch(`/api/workspaces/${selectedWsId}/members`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const currentMember = data.find((m: any) => m._id === user?.id);
        if (currentMember) {
          setWsRole(currentMember.workspaceRole);
        } else if (user?.role === "Owner" || user?.role === "Admin") {
          setWsRole(user.role);
        } else {
          setWsRole("Viewer");
        }
      }
    } catch (e) {
      setWsRole("Viewer");
    }
  };

  const handleInlineAdd = async (title: string, status: string, description?: string) => {
    try {
      let body: any = {
        title,
        status,
        priority: "P2",
        projectId: selectedProjectId || projects[0]?._id,
      };
      if (description) body.description = description;

      if (selectedEpicId) body.epicId = selectedEpicId;
      if (selectedStoryId) body.storyId = selectedStoryId;

      const endpoint = selectedStoryId
        ? `/api/workItems/stories/${selectedStoryId}/tasks`
        : "/api/workItems";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Task created successfully!");
        fetchTasks();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create task");
      }
    } catch (err) {
      toast.error("Failed to add task.");
    }
  };

  const updateLocalTask = (id: string, updates: Partial<Task>) => {
    if (selectedTask?._id === id) {
      setSelectedTask({ ...selectedTask, ...updates });
    }
  };

  const handleSaveTask = async (task: Task | null) => {
    if (!task || !canEditWorkspace) return;
    try {
      const res = await fetch(`/api/workItems/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          description: task.description,
        }),
      });
      if (res.ok) {
        toast.success("Task saved!");
        fetchTasks();
        setSelectedTask(null);
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  // Client-side filtering based on breadcrumb selectors
  const filteredTasks = (fetchedTasks as Task[] || []).filter((t) => {
    if (!t) return false;
    const titleStr = typeof t.title === "string" ? t.title : "";
    const idStr = typeof t._id === "string" ? t._id : "";
    
    const matchesSearch =
      titleStr.toLowerCase().includes((searchQuery || "").toLowerCase()) ||
      idStr.toLowerCase().includes((searchQuery || "").toLowerCase());
      
    const matchesProject = !selectedProjectId || t.projectId === selectedProjectId;
    const matchesEpic = !selectedEpicId || t.epicId === selectedEpicId;
    const matchesStory = !selectedStoryId || t.storyId === selectedStoryId;
    return matchesSearch && matchesProject && matchesEpic && matchesStory;
  });

  // Native HTML5 Task Drag Handlers
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canEditWorkspace) return;

    // If dragged task is already part of selection, drag all selected; otherwise drag only this one
    const targets = selectedTaskIds.includes(taskId) ? selectedTaskIds : [taskId];

    setDraggedTaskIds(targets);
    setActiveId(taskId);

    e.dataTransfer.setData("text/plain", JSON.stringify(targets));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragEnd = () => {
    setActiveId(null);
    setDraggedTaskIds([]);
  };

  const handleTaskDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("text/plain");
    let targets = draggedTaskIds;

    try {
      if (dataStr) {
        targets = JSON.parse(dataStr);
      }
    } catch (err) {}

    if (!targets || targets.length === 0) return;

    // Trigger optimistic mutation updates on all targets
    try {
      await Promise.all(
        targets.map((id) => updateStatusMutation.mutateAsync({ taskId: id, status: targetStatus }))
      );
      toast.success(`Moved ${targets.length} tasks to ${targetStatus}`);
    } catch (err) {
      toast.error("Failed to update status on server");
    }

    setSelectedTaskIds([]);
    setDraggedTaskIds([]);
    setActiveId(null);
  };

  // Column Reordering Drag Handlers
  const handleColDragStart = (e: React.DragEvent, index: number) => {
    if (!canEditWorkspace) return;
    setDraggedColIndex(index);
    e.dataTransfer.setData("column-index", index.toString());
  };

  const handleColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData("column-index");
    if (!sourceIndexStr && draggedColIndex === null) return;
    const sourceIndex = sourceIndexStr ? parseInt(sourceIndexStr, 10) : draggedColIndex!;

    if (sourceIndex === targetIndex) return;

    const reordered = [...columns];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);
    setColumns(reordered);
    setDraggedColIndex(null);
  };

  // Toggle checklist selection
  const toggleSelectTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  return (
    <div className="flex h-full relative overflow-hidden bg-surface-container-lowest">
      <div className={cn("p-6 md:p-8 w-full flex-1 flex flex-col transition-all duration-300", selectedTask ? "mr-[400px]" : "")}>
        
        {/* Dynamic Breadcrumbs and Selectors */}
        <div className="mb-6 mt-2 flex flex-col gap-4 border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-1.5 text-body-sm font-medium text-outline flex-wrap">
            {selectedProjectId && (
              <span
                className="text-on-surface font-semibold shrink-0 cursor-pointer hover:underline"
                onClick={() => {
                  setSelectedEpicId("");
                  setSelectedStoryId("");
                }}
              >
                {projects.find((p) => p._id === selectedProjectId)?.name}
              </span>
            )}
            {selectedEpicId && (
              <>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-on-surface-variant font-medium cursor-pointer hover:underline" onClick={() => setSelectedStoryId("")}>
                  {epics.find((e) => e._id === selectedEpicId)?.title}
                </span>
              </>
            )}
            {selectedStoryId && (
              <>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-bold">
                  {stories.find((s) => s._id === selectedStoryId)?.title}
                </span>
              </>
            )}
          </div>

          {/* Context Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-outline">Workspace</label>
              <select
                value={selectedWsId}
                onChange={(e) => setSelectedWsId(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg p-2 text-body-sm font-medium"
              >
                {workspaces.map((ws) => (
                  <option key={ws._id} value={ws._id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-outline">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={projects.length === 0}
                className="w-full bg-white border border-outline-variant rounded-lg p-2 text-body-sm font-medium disabled:bg-surface-container-high/50"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-outline">Epic</label>
              <select
                value={selectedEpicId}
                onChange={(e) => setSelectedEpicId(e.target.value)}
                disabled={!selectedProjectId || epics.length === 0}
                className="w-full bg-white border border-outline-variant rounded-lg p-2 text-body-sm font-medium disabled:bg-surface-container-high/50"
              >
                <option value="">All Epics</option>
                {epics.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-outline">Story</label>
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                disabled={!selectedEpicId || stories.length === 0}
                className="w-full bg-white border border-outline-variant rounded-lg p-2 text-body-sm font-medium disabled:bg-surface-container-high/50"
              >
                <option value="">All Stories</option>
                {stories.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 mb-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/50 text-on-surface rounded-lg w-full focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-label-md w-full placeholder:text-outline-variant"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant shrink-0">
            <span className="text-label-sm font-label-sm">View:</span>
            <div className="flex bg-surface-container-low p-1 rounded">
              <button
                onClick={() => setView("list")}
                className={cn("p-1 px-2 rounded transition-colors", view === "list" ? "bg-white shadow-sm text-primary" : "hover:bg-surface-container-high")}
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn("p-1 px-2 rounded transition-colors", view === "grid" ? "bg-white shadow-sm text-primary" : "hover:bg-surface-container-high")}
              >
                <span className="material-symbols-outlined text-[18px]">view_column</span>
              </button>
            </div>
          </div>
        </div>

        {/* Board Content */}
        {view === "list" ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-container-low sticky top-0 z-10">
                <tr className="border-b border-outline-variant text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="p-4 font-bold w-12">Select</th>
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Priority</th>
                  <th className="p-4 font-bold">Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task._id}
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        "border-b border-outline-variant/30 hover:bg-surface-container-highest transition-colors cursor-pointer group",
                        selectedTaskIds.includes(task._id) && "bg-primary/5"
                      )}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(task._id)}
                          onChange={(e) => {
                            setSelectedTaskIds((prev) =>
                              prev.includes(task._id) ? prev.filter((id) => id !== task._id) : [...prev, task._id]
                            );
                          }}
                        />
                      </td>
                      <td className="p-4 text-label-md text-on-surface-variant font-medium">{(task._id || "").substring(Math.max(0, (task._id || "").length - 6))}</td>
                      <td className="p-4 text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                        {!canEditWorkspace && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">lock</span>}
                        {task.title}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-surface-container-high rounded text-[11px] font-bold border border-outline-variant/50 shadow-sm">
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn("flex items-center gap-1.5 font-bold text-[12px]", PRIORITY_COLORS[task.priority] || "text-on-surface-variant")}>
                          <span className={cn("w-2 h-2 rounded-full", PRIORITY_BGS[task.priority] || "bg-on-surface-variant")}></span>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4 text-label-md text-on-surface-variant">{canEditWorkspace ? "Full" : "View Only"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Kanban Board utilizing pure HTML5 Drag and Drop */
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar flex-1 min-h-0">
            {columns.map((colStatus, colIndex) => {
              const colTasks = filteredTasks.filter((t) => t.status === colStatus);
              return (
                <div
                  key={colStatus}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleTaskDrop(e, colStatus)}
                  className="min-w-[300px] flex-1 glass-panel rounded-2xl flex flex-col h-full shrink-0"
                >
                  {/* Draggable Column Header for Column Reordering */}
                  <div
                    draggable={canEditWorkspace}
                    onDragStart={(e) => handleColDragStart(e, colIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleColDrop(e, colIndex)}
                    className="p-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center rounded-t-xl cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-label-md">{colStatus}</h3>
                      <span className="px-2 py-0.5 bg-surface-container-high rounded text-label-sm">{colTasks.length}</span>
                    </div>
                  </div>

                  {/* Tasks Container */}
                  <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[200px]">
                    {colTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task._id);
                      return (
                        <div
                          key={task._id}
                          draggable={canEditWorkspace}
                          onDragStart={(e) => handleTaskDragStart(e, task._id)}
                          onDragEnd={handleTaskDragEnd}
                          onClick={() => setSelectedTask(task)}
                          className={cn(
                            "glass-panel rounded-xl p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all cursor-grab active:cursor-grabbing group relative",
                            isSelected && "border-primary ring-2 ring-primary/30",
                            activeId === task._id && "opacity-40"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-label-sm text-on-surface-variant">{(task._id || "").substring(Math.max(0, (task._id || "").length - 6))}</span>
                            {/* Checkbox for multi-select */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => toggleSelectTask(task._id, e)}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
                            />
                          </div>
                          <h4 className={cn("text-body-md font-semibold mb-3 text-on-surface", task.status === "Done" && "line-through text-on-surface-variant")}>
                            {task.title}
                          </h4>
                          <div className="flex justify-between items-end mt-auto">
                            <span className={cn("flex items-center gap-1 font-bold text-[11px]", PRIORITY_COLORS[task.priority] || "text-on-surface-variant")}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_BGS[task.priority] || "bg-on-surface-variant")}></span>
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[11px] font-medium text-on-surface-variant">
                                {isNaN(Date.parse(task.dueDate)) ? "No date" : new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {colTasks.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-outline-variant/30 rounded-lg flex items-center justify-center text-outline-variant mt-2 text-label-sm font-bold opacity-50">
                        Drop tasks here
                      </div>
                    )}

                    {canEditWorkspace && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="+ Add a card..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                              handleInlineAdd((e.target as HTMLInputElement).value.trim(), colStatus);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="w-full bg-transparent text-label-sm text-on-surface font-medium placeholder:text-outline-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:p-2 focus:-ml-2 rounded transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide Detail Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full sm:w-[400px] glass-panel border-l border-outline-variant/30 shadow-2xl z-40 flex flex-col"
          >
            <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-transparent shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-surface-container-high rounded text-label-sm font-bold text-on-surface-variant">
                  {selectedTask._id}
                </span>
                {!canEditWorkspace && (
                  <span className="px-2 py-1 bg-error/10 text-error rounded text-label-sm font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span> Read Only
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 hover:bg-surface-container-high rounded transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
              <textarea
                disabled={!canEditWorkspace}
                value={selectedTask.title || ""}
                onChange={(e) => updateLocalTask(selectedTask._id, { title: e.target.value })}
                className="w-full text-headline-sm font-headline-sm font-bold text-on-surface bg-transparent border-none outline-none resize-none focus:bg-surface-container-low p-2 -ml-2 rounded transition-colors disabled:opacity-80"
                rows={2}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between group">
                  <span className="text-label-sm font-label-sm text-on-surface-variant w-24">Status</span>
                  <select
                    disabled={!canEditWorkspace}
                    value={selectedTask.status || ""}
                    onChange={(e) => updateLocalTask(selectedTask._id, { status: e.target.value as any })}
                    className="flex-1 bg-transparent border-none text-label-md font-bold text-on-surface focus:outline-none cursor-pointer p-1 -ml-1 rounded hover:bg-surface-container-low disabled:appearance-none disabled:opacity-80"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between group">
                  <span className="text-label-sm font-label-sm text-on-surface-variant w-24">Priority</span>
                  <select
                    disabled={!canEditWorkspace}
                    value={selectedTask.priority || "P2"}
                    onChange={(e) => updateLocalTask(selectedTask._id, { priority: e.target.value as any })}
                    className="flex-1 bg-transparent border-none text-label-md font-bold text-on-surface focus:outline-none cursor-pointer p-1 -ml-1 rounded hover:bg-surface-container-low disabled:appearance-none disabled:opacity-80"
                  >
                    <option value="P0">P0 - Critical</option>
                    <option value="P1">P1 - High</option>
                    <option value="P2">P2 - Normal</option>
                    <option value="P3">P3 - Low</option>
                  </select>
                </div>

                <div className="flex items-center justify-between group">
                  <span className="text-label-sm font-label-sm text-on-surface-variant w-24">Due Date</span>
                  <input
                    disabled={!canEditWorkspace}
                    type="date"
                    value={(() => {
                      if (!selectedTask.dueDate) return "";
                      const parsed = Date.parse(selectedTask.dueDate);
                      if (isNaN(parsed)) return "";
                      try {
                        return new Date(parsed).toISOString().substring(0, 10);
                      } catch (err) {
                        return "";
                      }
                    })()}
                    onChange={(e) => updateLocalTask(selectedTask._id, { dueDate: e.target.value })}
                    className="flex-1 bg-transparent border-none text-label-md font-bold text-on-surface focus:outline-none cursor-pointer p-1 -ml-1 rounded hover:bg-surface-container-low disabled:opacity-80"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-outline-variant">
                <h3 className="text-label-md font-bold text-on-surface mb-3">Description</h3>
                <textarea
                  disabled={!canEditWorkspace}
                  value={selectedTask.description || ""}
                  onChange={(e) => updateLocalTask(selectedTask._id, { description: e.target.value })}
                  placeholder="Add a detailed description..."
                  className="w-full min-h-[150px] text-body-md text-on-surface-variant bg-transparent border border-outline-variant/50 focus:border-primary rounded-lg p-3 outline-none resize-y transition-colors disabled:bg-surface-container-lowest disabled:opacity-80"
                />
              </div>

              <div className="pt-6 border-t border-outline-variant">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-label-md font-bold text-on-surface">AI Summary (Broadcast)</h3>
                  <button 
                    onClick={handleTriggerSummary} 
                    disabled={isSummarizing}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    {isSummarizing ? "Summarizing..." : "Summarize"}
                  </button>
                </div>
                {aiSummary && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-body-sm text-on-surface whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-lowest shrink-0 flex justify-end gap-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
              >
                Close
              </button>
              {canEditWorkspace && (
                <button
                  onClick={() => handleSaveTask(selectedTask)}
                  className="px-4 py-2 font-label-md text-label-md bg-primary text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default Tasks;
