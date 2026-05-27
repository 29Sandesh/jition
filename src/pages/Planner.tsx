import { useState, useEffect, useMemo } from "react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { addDays, startOfWeek, format, differenceInDays, subDays, isToday, parseISO } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  dueDate: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  labels?: string[];
  estimate?: number;
}

const PRESET_LABELS = ["Frontend", "Backend", "Design", "Bug", "Feature", "Research"];

const CELL_WIDTH = 120;
const ROW_HEIGHT = 80;

export function Planner() {
  const { user, organisation } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [groupBy, setGroupBy] = useState<"Assignee" | "Status">("Assignee");
  
  // Timeline dates
  const [timelineStart, setTimelineStart] = useState(() => subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 2));
  const daysToShow = 45;
  const days = useMemo(() => Array.from({length: daysToShow}).map((_, i) => addDays(timelineStart, i)), [timelineStart]);

  useEffect(() => {
    if (!user) return;

    const authHeaders = {
      "x-workspace-id": "default-workspace-id",
      "x-organisation-id": organisation?.id || user?.organisationId || "",
      "x-user-id": user?.id || "",
      "x-company-id": organisation?.id || user?.organisationId || ""
    };

    Promise.all([
      fetch("/api/workItems", { headers: authHeaders }).then((res) => res.json()),
      fetch("/api/organisations/members", { headers: authHeaders }).then((res) => res.json())
    ])
      .then(([tasksData, membersData]) => {
        const members = Array.isArray(membersData) ? membersData : [];
        setTeamMembers([...members, { id: "unassigned", name: "Unassigned", role: "Team Member" }]);

        const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData.items || tasksData.data || []);
        const augmented = tasksArray.map((t: any, i: number) => {
          let parsedEndDate = t.dueDate ? parseISO(t.dueDate) : null;
          let endDate = parsedEndDate && !isNaN(parsedEndDate.getTime()) 
            ? parsedEndDate 
            : addDays(timelineStart, (i * 3) % 15 + 2);

          let parsedStartDate = t.startDate ? parseISO(t.startDate as any) : null;
          let startDate = parsedStartDate && !isNaN(parsedStartDate.getTime()) 
            ? parsedStartDate 
            : subDays(endDate, 2);

          return {
            ...t,
            id: t._id || t.id,
            startDate,
            endDate,
            description: t.description || "No description provided. Click to add context, sub-tasks, or notes for this item.",
            labels: t.labels || (i % 2 === 0 ? ["Feature", "Frontend"] : ["Backend"]),
            estimate: t.estimate || ((i % 5) + 1)
          };
        });
        setTasks(augmented);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch planner data", err);
        setLoading(false);
      });
  }, [user, organisation, timelineStart]);

  const handleTaskDragEnd = (task: Task, offset: number) => {
    const dayOffset = Math.round(offset / CELL_WIDTH);
    if (dayOffset === 0) return;
    
    setTasks(prev => prev.map(t => {
      if (t.id === task.id && t.startDate && t.endDate) {
        return {
          ...t,
          startDate: addDays(t.startDate, dayOffset),
          endDate: addDays(t.endDate, dayOffset)
        };
      }
      return t;
    }));
    toast(`Rescheduled ${task.title}`);
  };

  const handleGridDoubleClick = (memberId: string, day: Date) => {
    const newTask: Task = {
      id: `new-${Date.now()}`,
      title: "New Draft Task",
      status: "Todo",
      priority: "P2",
      assigneeIds: memberId === 'unassigned' ? [] : [memberId],
      dueDate: format(addDays(day, 2), "MMM dd"),
      startDate: day,
      endDate: addDays(day, 2),
      description: "",
      labels: [],
      estimate: 1
    };
    setTasks([...tasks, newTask]);
    setActiveTask(newTask);
  };

  const updateActiveTask = async (updates: Partial<Task>) => {
    if (!activeTask) return;
    const updated = { ...activeTask, ...updates };
    setActiveTask(updated);
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

    try {
      const authHeaders = {
        "x-workspace-id": "default-workspace-id",
        "x-organisation-id": organisation?.id || user?.organisationId || "",
        "x-user-id": user?.id || "",
        "x-company-id": organisation?.id || user?.organisationId || "",
        "Content-Type": "application/json"
      };

      const isNew = typeof updated.id === "string" && updated.id.startsWith("new-");
      const url = isNew ? "/api/workItems" : `/api/workItems/${updated.id}`;
      const method = isNew ? "POST" : "PUT";

      let body: any;
      if (isNew) {
        body = {
          title: updated.title || "New Draft Task",
          status: updated.status || "Todo",
          priority: updated.priority || "P2",
          description: updated.description || "",
          assigneeIds: updated.assigneeIds || [],
          dueDate: updated.dueDate || new Date().toISOString(),
          estimate: updated.estimate || 1,
          tags: updated.labels || []
        };
      } else {
        body = { ...updates };
        if (updates.labels !== undefined) {
          body.tags = updates.labels;
          delete body.labels;
        }
      }

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("You don't have permission to update tasks.");
        } else {
          toast.error("Failed to save changes.");
        }
      } else {
        const data = await res.json();
        if (isNew && data.item) {
          const savedItem = {
            ...updated,
            id: data.item._id || data.item.id,
            _id: data.item._id
          };
          setTasks(prev => prev.map(t => t.id === updated.id ? savedItem : t));
          setActiveTask(savedItem);
        }
      }
    } catch (err) {
      toast.error("Error saving task.");
    }
  };

  const groups = useMemo(() => {
    if (groupBy === "Assignee") {
      return teamMembers.map(member => ({
        id: member.id,
        label: member.name,
        subLabel: member.role,
        avatar: member.avatar,
        tasks: tasks.filter(t => member.id === 'unassigned' ? (!t.assigneeIds || t.assigneeIds.length === 0) : (t.assigneeIds && t.assigneeIds.includes(member.id)))
      }));
    } else {
      const statuses = ["Todo", "In Progress", "Review", "Done"];
      return statuses.map(status => ({
        id: status,
        label: status,
        subLabel: "Status Category",
        avatar: "",
        tasks: tasks.filter(t => t.status === status)
      }));
    }
  }, [tasks, groupBy, teamMembers]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col h-full overflow-hidden relative">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mb-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Timeline Roadmap</h2>
          <p className="text-body-md text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            {format(timelineStart, "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-1 px-2">
            <span className="text-label-sm font-bold text-on-surface-variant">Group by:</span>
            <select 
              value={groupBy} 
              onChange={e => setGroupBy(e.target.value as any)}
              className="bg-transparent text-label-md font-bold focus:outline-none cursor-pointer"
            >
              <option value="Assignee">Assignee</option>
              <option value="Status">Status</option>
            </select>
          </div>
          <button 
            onClick={() => {
               const newId = `task-${Date.now()}`;
               const newTask: Task = {
                  id: newId, title: "New Roadmap Item", status: "Todo", priority: "P1", assigneeIds: [],
                  dueDate: format(addDays(new Date(), 3), "MMM dd"), startDate: new Date(), endDate: addDays(new Date(), 3),
                  labels: [], estimate: 3
               };
               setTasks([...tasks, newTask]);
               setActiveTask(newTask);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Issue
          </button>
        </div>
      </section>

      <div className="flex-1 bg-white rounded-xl border border-outline-variant overflow-hidden flex flex-col relative shadow-sm">
        {/* Header Row */}
        <div className="flex border-b border-outline-variant bg-surface-container-lowest shrink-0">
          <div className="w-[280px] shrink-0 p-4 border-r border-outline-variant flex items-center justify-between z-20 bg-surface-container-lowest">
            <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{groupBy}</span>
          </div>
          <div className="flex-1 overflow-x-auto custom-scrollbar flex relative z-10" id="timeline-header-scroll" onScroll={(e) => {
             const bodyScroll = document.getElementById('timeline-body-scroll');
             if (bodyScroll) bodyScroll.scrollLeft = e.currentTarget.scrollLeft;
          }}>
            <div className="flex w-max">
              {days.map((day, idx) => (
                <div key={idx} className={cn("shrink-0 flex flex-col items-center justify-center border-r border-outline-variant/30 py-2", isToday(day) && "bg-primary/5")} style={{ width: CELL_WIDTH }}>
                  <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-widest">{format(day, "EEE")}</span>
                  <span className={cn("text-label-md font-bold w-7 h-7 flex items-center justify-center rounded-full mt-1", isToday(day) ? "bg-primary text-white" : "text-on-surface")}>
                    {format(day, "d")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto flex relative">
          <div className="w-[280px] shrink-0 border-r border-outline-variant bg-white z-20 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] flex flex-col">
            {loading ? (
              <div className="p-8 text-center text-on-surface-variant">Loading...</div>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="p-4 border-b border-outline-variant flex items-center gap-3 bg-white" style={{ height: ROW_HEIGHT }}>
                  {groupBy === "Assignee" && group.avatar ? (
                    <img className="w-8 h-8 rounded-full object-cover bg-surface-container-highest" src={group.avatar} alt={group.label || "Member"} />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-title-sm">
                      {(group.label || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-label-md font-bold text-on-surface truncate">{group.label || "Unknown Member"}</p>
                    <p className="text-[11px] text-on-surface-variant truncate">{group.subLabel || "No Role"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="flex-1 overflow-x-auto custom-scrollbar relative bg-surface-container-lowest/30" id="timeline-body-scroll" onScroll={(e) => {
             const headerScroll = document.getElementById('timeline-header-scroll');
             if (headerScroll) headerScroll.scrollLeft = e.currentTarget.scrollLeft;
          }}>
             <div className="relative w-max" style={{ width: daysToShow * CELL_WIDTH, height: groups.length * ROW_HEIGHT }}>
                {/* Background Grid */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((day, idx) => (
                    <div key={idx} className={cn("shrink-0 border-r border-outline-variant/30 h-full", isToday(day) && "bg-primary/5")} style={{ width: CELL_WIDTH }}></div>
                  ))}
                </div>
                
                {/* Horizontal Lines */}
                {groups.map((_, idx) => (
                  <div key={idx} className="absolute w-full border-b border-outline-variant pointer-events-none" style={{ top: (idx + 1) * ROW_HEIGHT }}></div>
                ))}

                {/* Double click to add target overlay */}
                <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${groups.length}, ${ROW_HEIGHT}px)`, gridTemplateColumns: `repeat(${daysToShow}, ${CELL_WIDTH}px)` }}>
                   {groups.map((group, rIdx) => (
                     days.map((day, cIdx) => (
                       <div key={`${rIdx}-${cIdx}`} className="w-full h-full cursor-pointer hover:bg-black/5 transition-colors" onDoubleClick={() => handleGridDoubleClick(group.id, day)}></div>
                     ))
                   ))}
                </div>

                {/* Task Bars */}
                {!loading && groups.map((group, rowIdx) => {
                  return group.tasks.map(task => {
                    if (!task.startDate || !task.endDate) return null;
                    const startOffset = differenceInDays(task.startDate, timelineStart);
                    const duration = differenceInDays(task.endDate, task.startDate) + 1;
                    
                    if (startOffset + duration < 0 || startOffset > daysToShow) return null; // Out of bounds
                    
                    const left = Math.max(0, startOffset) * CELL_WIDTH;
                    const width = duration * CELL_WIDTH;
                    const top = (rowIdx * ROW_HEIGHT) + 16; // 16px padding

                    return (
                      <motion.div
                        key={task.id + task.startDate.toISOString() + rowIdx}
                        drag="x"
                        dragConstraints={{ left: -1000, right: 1000 }} // Allow free drag, snap on end
                        onDragEnd={(e, info) => handleTaskDragEnd(task, info.offset.x)}
                        whileDrag={{ scale: 1.02, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
                        className={cn(
                          "absolute h-12 rounded-lg border flex flex-col justify-center px-3 cursor-grab shadow-sm overflow-hidden group backdrop-blur-md transition-colors",
                          task.status === 'Done' ? "bg-surface-container-high border-outline-variant text-on-surface-variant opacity-80" : 
                          task.priority === 'P0' ? "bg-error text-white border-error/50" :
                          task.priority === 'P1' ? "bg-amber-600 text-white border-amber-600/50" :
                          task.priority === 'P2' ? "bg-primary text-white border-primary/50" :
                          "bg-surface-variant text-on-surface-variant border-outline-variant"
                        )}
                        style={{ left, width: Math.max(CELL_WIDTH - 10, width - 8), top }} // slightly smaller than cell to leave gaps
                        onClick={(e) => { e.stopPropagation(); setActiveTask(task); }}
                      >
                         <div className="flex items-center gap-2">
                           <span className={cn("text-label-sm font-bold truncate", task.status === 'Done' && "line-through")}>{task.title}</span>
                         </div>
                      </motion.div>
                    );
                  });
                })}
             </div>
          </div>
        </div>
      </div>

      {/* Notion-Style Side Peek Panel */}
      <AnimatePresence>
        {activeTask && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
              onClick={() => setActiveTask(null)}
            />
            <motion.div 
              initial={{ x: "100%", boxShadow: "-10px 0 30px rgba(0,0,0,0)" }}
              animate={{ x: 0, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)" }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-full max-w-[600px] bg-white z-50 flex flex-col shadow-2xl border-l border-outline-variant"
            >
               <div className="h-40 bg-surface-container-high relative shrink-0 group">
                  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Cover" />
                  <div className="absolute top-4 right-4 flex gap-2">
                     <button className="px-3 py-1.5 bg-white/80 hover:bg-white text-gray-800 rounded-lg text-label-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[16px]">image</span> Change Cover
                     </button>
                  </div>
               </div>
               
               <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                  <input 
                    value={activeTask.title}
                    onChange={e => updateActiveTask({ title: e.target.value })}
                    className="w-full text-headline-lg font-headline-lg font-bold text-on-surface mb-8 bg-transparent focus:outline-none placeholder:text-outline-variant resize-none"
                    placeholder="Task Title"
                  />
                  
                  <div className="grid grid-cols-[120px_1fr] gap-y-4 mb-10 text-body-md items-start">
                     
                     {/* Assignees (Multi-select) */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">group</span> Assignees
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
                       {activeTask.assigneeIds.map(id => {
                         const member = teamMembers.find(m => m.id === id);
                         if (!member || member.id === 'unassigned') return null;
                         return (
                           <div key={id} className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-full pl-1 pr-2 py-0.5 text-[12px] font-medium shadow-sm hover:bg-surface-container-high transition-colors">
                             {member.avatar ? <img src={member.avatar} className="w-4 h-4 rounded-full object-cover" /> : <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">{(member.name || "?").charAt(0).toUpperCase()}</div>}
                             {member.name}
                             <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error ml-1" onClick={() => updateActiveTask({ assigneeIds: activeTask.assigneeIds.filter(a => a !== id) })}>close</span>
                           </div>
                         );
                       })}
                       <select 
                         value=""
                         onChange={e => {
                           if (e.target.value && !activeTask.assigneeIds.includes(e.target.value)) {
                             updateActiveTask({ assigneeIds: [...activeTask.assigneeIds, e.target.value] });
                           }
                         }} 
                         className="bg-transparent text-label-sm focus:outline-none cursor-pointer text-primary font-bold hover:underline"
                       >
                         <option value="" disabled>+ Add Assignee</option>
                         {teamMembers.filter(m => m.id !== 'unassigned' && !activeTask.assigneeIds.includes(m.id)).map(m => (
                           <option key={m.id} value={m.id}>{m.name}</option>
                         ))}
                       </select>
                     </div>

                     {/* Status */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">radio_button_checked</span> Status
                     </div>
                     <div>
                       <select value={activeTask.status} onChange={e => updateActiveTask({ status: e.target.value })} className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium hover:bg-surface-container-low transition-colors">
                         <option>Todo</option><option>In Progress</option><option>Review</option><option>Done</option>
                       </select>
                     </div>
                     
                     {/* Priority */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">flag</span> Priority
                     </div>
                     <div>
                       <select value={activeTask.priority} onChange={e => updateActiveTask({ priority: e.target.value })} className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium hover:bg-surface-container-low transition-colors">
                         <option>P0</option><option>P1</option><option>P2</option><option>P3</option>
                       </select>
                     </div>

                     {/* Dates (Editable) */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">date_range</span> Dates
                     </div>
                     <div className="flex items-center gap-2 text-on-surface font-medium">
                        <input 
                           type="date" 
                           value={activeTask.startDate ? format(activeTask.startDate, "yyyy-MM-dd") : ''}
                           onChange={e => updateActiveTask({ startDate: parseISO(e.target.value) })}
                           className="px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary hover:bg-surface-container-low transition-colors"
                        />
                        <span className="material-symbols-outlined text-[16px] text-outline-variant">arrow_forward</span>
                        <input 
                           type="date" 
                           value={activeTask.endDate ? format(activeTask.endDate, "yyyy-MM-dd") : ''}
                           onChange={e => updateActiveTask({ endDate: parseISO(e.target.value) })}
                           className="px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary hover:bg-surface-container-low transition-colors"
                        />
                     </div>

                     {/* Estimate */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">timelapse</span> Estimate
                     </div>
                     <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         min="1" max="100" 
                         value={activeTask.estimate || 1} 
                         onChange={e => updateActiveTask({ estimate: parseInt(e.target.value) || 1 })}
                         className="w-16 px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium hover:bg-surface-container-low transition-colors"
                       />
                       <span className="text-label-sm text-on-surface-variant">points</span>
                     </div>

                     {/* Labels (Tags) */}
                     <div className="text-on-surface-variant flex items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-[18px]">label</span> Labels
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
                       {activeTask.labels?.map(label => (
                         <div key={label} className="flex items-center gap-1 bg-secondary-container text-on-secondary-container border border-secondary/20 rounded pl-2 pr-1 py-0.5 text-[12px] font-bold shadow-sm">
                           {label}
                           <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error opacity-70 hover:opacity-100" onClick={() => updateActiveTask({ labels: activeTask.labels?.filter(l => l !== label) })}>close</span>
                         </div>
                       ))}
                       <select 
                         value=""
                         onChange={e => {
                           if (e.target.value && !(activeTask.labels || []).includes(e.target.value)) {
                             updateActiveTask({ labels: [...(activeTask.labels || []), e.target.value] });
                           }
                         }} 
                         className="bg-transparent text-label-sm focus:outline-none cursor-pointer text-primary font-bold hover:underline"
                       >
                         <option value="" disabled>+ Add Label</option>
                         {PRESET_LABELS.filter(l => !(activeTask.labels || []).includes(l)).map(l => (
                           <option key={l} value={l}>{l}</option>
                         ))}
                       </select>
                     </div>
                  </div>
                  
                  {/* Rich Description */}
                  <div className="border-t border-outline-variant pt-8">
                    <h3 className="text-label-md font-bold text-on-surface mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[18px]">description</span> 
                       Description
                    </h3>
                    <textarea 
                      value={activeTask.description || ""}
                      onChange={e => updateActiveTask({ description: e.target.value })}
                      placeholder="Add description, notes, or sub-tasks here... You can write as much as you need."
                      className="w-full min-h-[300px] p-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y text-body-lg text-on-surface leading-relaxed shadow-inner hover:bg-white transition-colors"
                    />
                  </div>
               </div>
               
               <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-2">
                 <button onClick={() => {
                    setTasks(tasks.filter(t => t.id !== activeTask.id));
                    setActiveTask(null);
                    toast.success("Task deleted");
                 }} className="px-4 py-2 bg-transparent text-error hover:bg-error/10 font-label-md rounded-lg transition-all">
                   Delete Task
                 </button>
                 <button onClick={() => setActiveTask(null)} className="px-6 py-2 bg-primary text-white font-label-md rounded-lg shadow-sm hover:bg-primary-container transition-all">
                   Save & Close
                 </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
