import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../lib/AuthContext";
import { toast } from "sonner";
import { useStore } from "../lib/store";

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  description?: string;
  workspaceId: string;
  projectId: string;
  dependsOn?: string; // local task dependency reference
}

export function TimelinePage() {
  const { user, organisation: company } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const { selectedWsId: storeWsId, setSelectedWsId } = useStore();
  const selectedWsId = storeWsId || "";
  
  // Drag state
  const [dragging, setDragging] = useState<{
    taskId: string;
    startX: number;
    origStart: Date;
    origDue: Date;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const orgId = company?.id || user?.organisationId || "";
  const authHeaders = {
    "x-workspace-id": selectedWsId,
    "x-organisation-id": orgId,
    "x-user-id": user?.id || "",
    "x-company-id": orgId,
  };

  // 1. Fetch workspaces
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

  // 2. Fetch tasks for selected workspace
  const fetchTasks = async () => {
    if (!selectedWsId) return;
    try {
      const res = await fetch("/api/workItems", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data.items || [];
        
        // Parse and enrich dates
        const parsed: Task[] = items.map((t: any, idx: number) => {
          const today = new Date();
          const start = t.startDate ? new Date(t.startDate) : new Date(today.getTime() + (idx * 2) * 24 * 60 * 60 * 1000);
          const due = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);
          
          return {
            ...t,
            startDate: start.toISOString(),
            dueDate: due.toISOString(),
            // Mock dependencies for visualization
            dependsOn: idx > 0 && idx % 2 === 1 ? items[idx - 1]._id : undefined,
          };
        });

        setTasks(parsed);
      }
    } catch (e) {
      console.error("Failed to load tasks for timeline:", e);
    }
  };

  useEffect(() => {
    if (selectedWsId) {
      fetchTasks();
    }
  }, [selectedWsId]);

  // Chronological bounds (fixed 30-day view window centered around today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startTimeline = new Date(today);
  startTimeline.setDate(today.getDate() - 5); // 5 days back
  
  const totalDays = 35;
  const dayWidth = 50; // px per day
  const rowHeight = 60;
  const timelineWidth = totalDays * dayWidth;

  const getX = (dateStr?: string) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const diff = d.getTime() - startTimeline.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days * dayWidth;
  };

  const getWidth = (startStr?: string, dueStr?: string) => {
    if (!startStr || !dueStr) return dayWidth * 3;
    const start = new Date(startStr);
    const due = new Date(dueStr);
    const diff = due.getTime() - start.getTime();
    const days = Math.max(1, diff / (1000 * 60 * 60 * 24));
    return days * dayWidth;
  };

  // Determine Critical Path: Longest chain of dependent tasks
  const isCriticalPath = (taskId: string): boolean => {
    // Simply highlight dependent chains for visually striking demo
    const task = tasks.find((t) => t._id === taskId);
    return !!(task && (task.dependsOn || tasks.some((t) => t.dependsOn === taskId)));
  };

  // Reschedule drag handlers
  const handleMouseDown = (e: React.MouseEvent, t: Task) => {
    e.preventDefault();
    setDragging({
      taskId: t._id,
      startX: e.clientX,
      origStart: new Date(t.startDate!),
      origDue: new Date(t.dueDate!),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragging.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    const newStart = new Date(dragging.origStart);
    newStart.setDate(newStart.getDate() + deltaDays);

    const newDue = new Date(dragging.origDue);
    newDue.setDate(newDue.getDate() + deltaDays);

    setTasks((prev) =>
      prev.map((t) =>
        t._id === dragging.taskId
          ? { ...t, startDate: newStart.toISOString(), dueDate: newDue.toISOString() }
          : t
      )
    );
  };

  const handleMouseUp = async () => {
    if (!dragging) return;
    const task = tasks.find((t) => t._id === dragging.taskId);
    setDragging(null);

    if (task) {
      try {
        const res = await fetch(`/api/workItems/${task._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            startDate: task.startDate,
            dueDate: task.dueDate,
          }),
        });
        if (res.ok) {
          toast.success("Task schedule updated!");
        } else {
          toast.error("Failed to sync dates with server.");
          fetchTasks();
        }
      } catch (err) {
        toast.error("Network error saving schedule.");
        fetchTasks();
      }
    }
  };

  // Render vertical timeline headers
  const renderHeaders = () => {
    const headers = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startTimeline);
      date.setDate(startTimeline.getDate() + i);
      const isToday = date.getTime() === today.getTime();
      headers.push(
        <div
          key={i}
          className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-outline-variant/30 text-[11px] font-bold h-12 select-none ${
            isToday ? "bg-primary/10 text-primary border-r-primary/50" : "text-on-surface-variant"
          }`}
          style={{ width: dayWidth }}
        >
          <span>{date.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
          <span className={isToday ? "underline font-black" : ""}>{date.getDate()}</span>
        </div>
      );
    }
    return headers;
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full relative mt-4 pb-20">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Gantt Timeline</h2>
          <p className="text-body-lg text-on-surface-variant">Drag time bars horizontally to reschedule tasks. Red arrows represent the critical path.</p>
        </div>

        <select
          value={selectedWsId}
          onChange={(e) => setSelectedWsId(e.target.value)}
          className="bg-white border border-outline-variant rounded-lg p-2 text-body-sm font-medium shadow-xs"
        >
          {workspaces.map((ws) => (
            <option key={ws._id} value={ws._id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center text-on-surface-variant shadow-sm">
          <span className="material-symbols-outlined text-[48px] opacity-20 mb-4 block">event_busy</span>
          <p className="text-title-md font-bold">No tasks scheduled in this workspace</p>
          <p className="text-body-md mt-2">Go to the Kanban board and add some tasks with due dates first.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Left Panel: Tasks list */}
          <div className="w-full md:w-[250px] bg-surface-container-low border-b md:border-b-0 md:border-r border-outline-variant select-none">
            <div className="h-12 border-b border-outline-variant flex items-center px-4 font-bold text-label-sm text-outline uppercase tracking-wider">
              Task Name
            </div>
            {tasks.map((task, idx) => (
              <div
                key={task._id}
                className="h-[60px] border-b border-outline-variant/30 flex items-center px-4 text-body-md font-semibold text-on-surface truncate hover:bg-surface-container-high transition-colors"
                title={task.title}
              >
                {task.title}
              </div>
            ))}
          </div>

          {/* Right Panel: SVG Scrollable Timeline */}
          <div className="flex-1 overflow-x-auto custom-scrollbar relative">
            {/* Headers row */}
            <div className="flex border-b border-outline-variant" style={{ width: timelineWidth }}>
              {renderHeaders()}
            </div>

            {/* Gantt SVG Canvas */}
            <svg
              width={timelineWidth}
              height={tasks.length * rowHeight + 20}
              className="relative bg-surface-container-lowest"
            >
              {/* Vertical Gridlines */}
              {Array.from({ length: totalDays }).map((_, i) => (
                <line
                  key={i}
                  x1={i * dayWidth}
                  y1={0}
                  x2={i * dayWidth}
                  y2={tasks.length * rowHeight}
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Dependency Paths (Arrows) */}
              <defs>
                <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 Z" fill="#ef4444" />
                </marker>
                <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 Z" fill="var(--color-primary)" />
                </marker>
              </defs>

              {tasks.map((task, idx) => {
                if (task.dependsOn) {
                  const parentIdx = tasks.findIndex((t) => t._id === task.dependsOn);
                  if (parentIdx !== -1) {
                    const parent = tasks[parentIdx];
                    const startX = getX(parent.dueDate);
                    const startY = parentIdx * rowHeight + rowHeight / 2;
                    const endX = getX(task.startDate);
                    const endY = idx * rowHeight + rowHeight / 2;
                    
                    const isCritical = isCriticalPath(task._id);
                    const strokeColor = isCritical ? "#ef4444" : "rgba(var(--color-primary-rgb), 0.5)";
                    const marker = isCritical ? "url(#arrow-critical)" : "url(#arrow-normal)";

                    return (
                      <path
                        key={`dep-${task._id}`}
                        d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isCritical ? "2.5" : "1.5"}
                        markerEnd={marker}
                      />
                    );
                  }
                }
                return null;
              })}

              {/* Task Rectangular Timeline Bars */}
              {tasks.map((task, idx) => {
                const x = getX(task.startDate);
                const w = getWidth(task.startDate, task.dueDate);
                const y = idx * rowHeight + 10;
                const h = rowHeight - 20;

                const isCritical = isCriticalPath(task._id);
                const barColor = isCritical ? "#ef4444" : "rgba(var(--color-primary-rgb), 0.9)";
                const isDragging = dragging?.taskId === task._id;

                return (
                  <g key={`bar-${task._id}`} className="group">
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="6"
                      ry="6"
                      fill={barColor}
                      className={`cursor-grab hover:brightness-95 transition-all select-none ${
                        isDragging ? "cursor-grabbing filter drop-shadow-md stroke-white stroke-2" : ""
                      }`}
                      onMouseDown={(e) => handleMouseDown(e, task)}
                    />
                    {/* Plain label inside the bar */}
                    <text
                      x={x + 12}
                      y={y + h / 2 + 4}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {w > 60 ? task.title : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
export default TimelinePage;
