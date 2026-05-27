import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/utils";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
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
        setActivities(data.activities || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [isOpen, user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[90]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[100] flex flex-col border-l border-outline-variant"
          >
            <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest sticky top-0 z-10">
              <div>
                <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  History Palette
                </h2>
                <p className="text-body-sm text-on-surface-variant">Recent activity across the company</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  <span className="text-label-sm font-bold text-on-surface-variant">Loading timeline...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">history_toggle_off</span>
                  <p className="text-label-lg font-bold text-on-surface mb-1">No activity yet</p>
                  <p className="text-body-sm text-on-surface-variant">When tasks are created or moved, they will appear here.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-outline-variant/30 ml-4 space-y-8 pb-12">
                  {activities.map((act, i) => (
                    <div key={act.id || i} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-sm" />
                      <div className="bg-white border border-outline-variant/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-label-md text-on-surface">{act.user}</span>
                          <span className="text-[11px] font-bold text-outline uppercase tracking-wider">{act.time}</span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant">
                          <span className="text-on-surface font-medium">{act.action}</span>{" "}
                          <span className="text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded">{act.target}</span>
                        </p>
                        
                        {(act.oldValue || act.newValue) && (
                          <div className="mt-3 flex items-center gap-2 text-[12px] bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 w-fit">
                            <span className="line-through text-error font-medium">{act.oldValue || "None"}</span>
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_right_alt</span>
                            <span className="text-success font-medium">{act.newValue || "None"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
