import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("completed");
  const [doneTasks, setDoneTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetch("/api/workItems/history", {
        headers: { 
          "x-user-id": user.id, 
          "x-company-id": user.companyId || "",
          "x-workspace-id": "default-workspace-id",
          "x-organisation-id": user.organisationId || ""
        }
      })
      .then(res => res.json())
      .then(data => {
        setDoneTasks(data.doneTasks || []);
        setActivities(data.activities || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [user]);

  const handleReopen = async (taskId: string) => {
    try {
      const res = await fetch(`/api/workItems/${taskId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user!.id,
          "x-company-id": user!.companyId || "",
          "x-workspace-id": "default-workspace-id",
          "x-organisation-id": user!.organisationId || ""
        },
        body: JSON.stringify({ status: "Todo" })
      });
      if (res.ok) {
        toast.success("Task reopened!");
        setDoneTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        const d = await res.json();
        toast.error(d.message || d.error || "Failed to reopen task");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const myActivities = activities.filter(a => a.user === user?.name);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "completed", label: "Completed Tasks" },
    { id: "my-activity", label: "My Activity" },
  ];
  if (user?.role === "Lead") {
    tabs.push({ id: "team-activity", label: "Team Activity" });
  }

  return (
    <div className="p-gutter max-w-[1000px] mx-auto w-full pb-20 flex flex-col md:flex-row gap-8">
      {/* Left Sidebar - Filters & Navigation */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-6 sticky top-8">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface tracking-tight mb-2">History</h2>
          <p className="text-body-sm text-on-surface-variant">Track completed work and audit logs.</p>
        </div>
        
        <nav className="flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 rounded-xl text-left font-bold transition-all text-label-md",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-md" 
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Main Content */}
      <div className="flex-1 bg-white border border-outline-variant rounded-3xl p-6 shadow-sm min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "completed" && (
              <div>
                <h3 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-success">task_alt</span>
                  Completed Tasks Archive
                </h3>
                {doneTasks.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-12">No completed tasks yet.</p>
                ) : (
                  <div className="space-y-4">
                    {doneTasks.map(task => (
                      <div key={task.id} className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex items-center justify-between hover:shadow-sm transition-shadow">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] uppercase font-bold rounded">Done</span>
                            <span className="text-label-sm font-bold text-outline">{task.id}</span>
                          </div>
                          <h4 className="text-label-lg font-bold text-on-surface">{task.title}</h4>
                        </div>
                        <button 
                          onClick={() => handleReopen(task.id)}
                          className="px-4 py-2 border border-outline-variant rounded-lg font-bold text-label-sm hover:bg-surface-container-low transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">undo</span>
                          Reopen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(activeTab === "my-activity" || activeTab === "team-activity") && (
              <div>
                <h3 className="text-title-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  {activeTab === "my-activity" ? "My Activity Timeline" : "Team Activity Audit Trail"}
                </h3>
                
                {(() => {
                  const dataList = activeTab === "my-activity" ? myActivities : activities;
                  if (dataList.length === 0) {
                    return <p className="text-on-surface-variant text-center py-12">No activity recorded yet.</p>;
                  }
                  
                  return (
                    <div className="relative border-l-2 border-outline-variant/30 ml-4 space-y-6 pb-4">
                      {dataList.map((act, i) => (
                        <div key={act.id || i} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-sm" />
                          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-label-md text-on-surface">{act.user}</span>
                              <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{act.time}</span>
                            </div>
                            <p className="text-body-sm text-on-surface-variant">
                              <span className="text-on-surface font-medium">{act.action}</span>{" "}
                              <span className="text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded">{act.target}</span>
                            </p>
                            
                            {(act.oldValue || act.newValue) && (
                              <div className="mt-3 flex items-center gap-2 text-[12px] bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 w-fit">
                                <span className="line-through text-error font-medium">{act.oldValue || "None"}</span>
                                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_right_alt</span>
                                <span className="text-success font-medium">{act.newValue || "None"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
