import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";
import { useDocs } from "../lib/DocsContext";
import { HistoryDrawer } from "./HistoryDrawer";

// Let's import cn from local utils to make sure it matches correctly
import { cn } from "../lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, company } = useAuth();
  const { workspaceName, logoBase64 } = useSettings();
  const { documents, activeDocId, setActiveDocId } = useDocs();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDocsExpanded, setIsDocsExpanded] = useState(location.pathname === "/docs" || location.pathname === "/new-page");

  useEffect(() => {
    if (location.pathname === "/docs" || location.pathname === "/new-page") {
      setIsDocsExpanded(true);
    }
  }, [location.pathname]);

  const links = [
    { to: "/", icon: "dashboard", label: "Dashboard" },
    { to: "/tasks", icon: "checklist", label: "Tasks" },
    { to: "/hierarchy", icon: "account_tree", label: "Hierarchy" },
    { to: "/docs", icon: "description", label: "Docs" },
    { to: "/planner", icon: "calendar_month", label: "Planner" },
    { to: "/messages", icon: "chat", label: "Messages" },
  ];

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full w-[260px] flex flex-col py-4 z-40 glass-sidebar spring-transition shadow-2xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Sidebar Header */}
      <div className="px-6 mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {logoBase64 ? (
            <img 
              src={logoBase64} 
              alt="Workspace Logo" 
              className="w-7 h-7 rounded-full object-cover shrink-0 border border-outline-variant/30 shadow-xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center shrink-0 bg-primary/5">
              <span className="material-symbols-outlined text-[15px] text-primary">corporate_fare</span>
            </div>
          )}
          <div>
            <h2 className="text-label-md font-bold text-on-surface truncate w-32">{workspaceName || company?.name || "Workspace"}</h2>
          </div>
        </div>
        
        {/* Mobile Close Toggle */}
        <button 
          onClick={onClose}
          className="md:hidden p-1.5 hover:bg-on-surface/10 active:scale-95 transition-all rounded-full flex items-center justify-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          
          if (link.to === "/docs") {
            return (
              <div key={link.to} className="flex flex-col">
                <div className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer group",
                  isActive
                    ? "bg-secondary-container text-on-secondary-container border-l-4 border-primary scale-[0.99] rounded-r-xl"
                    : "text-on-surface-variant hover:bg-on-surface/5"
                )}>
                  <Link
                    to={link.to}
                    onClick={() => { 
                      setIsDocsExpanded(true); 
                      onClose?.(); 
                    }}
                    className="flex items-center gap-3 flex-1"
                  >
                    <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
                    <span className="text-label-md font-bold">{link.label}</span>
                  </Link>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setIsDocsExpanded(!isDocsExpanded); 
                    }}
                    className="p-1 rounded-lg hover:bg-on-surface/10 text-on-surface-variant flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isDocsExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                </div>
                
                {isDocsExpanded && (
                  <div className="flex flex-col gap-1 pl-10 pr-2 mt-1 mb-2">
                    {documents.map(doc => (
                      <Link
                        key={doc.id}
                        to="/docs"
                        onClick={() => {
                          setActiveDocId(doc.id);
                          onClose?.();
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                          activeDocId === doc.id && isActive
                            ? "bg-primary/10 text-primary font-bold shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 text-label-sm"
                        )}
                      >
                        <span className="text-[14px]">{doc.emoji}</span>
                        <span className="truncate">{doc.title || "Untitled"}</span>
                      </Link>
                    ))}
                    <Link
                      to="/new-page"
                      onClick={onClose}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-primary hover:bg-primary/10 text-label-sm font-bold mt-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      New Page
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                isActive
                  ? "bg-secondary-container text-on-secondary-container border-l-4 border-primary scale-[0.99] rounded-r-xl"
                  : "text-on-surface-variant hover:bg-on-surface/5"
              )}
            >
              <span className="material-symbols-outlined text-[22px]">{link.icon}</span>
              <span className="text-label-md font-bold">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer Info & Palette */}
      <div className="mt-auto px-3 space-y-1 border-t border-outline-variant/30 pt-4">
        
        {/* Workspace Done Stats */}
        <div className="flex gap-1.5 justify-between mb-4 px-1 pb-4 border-b border-outline-variant/30 text-center">
          <div className="flex-1 bg-on-surface/5 rounded-xl p-1.5">
            <p className="text-[9px] uppercase text-on-surface-variant font-bold">Done</p>
            <p className="text-label-sm font-bold text-success">3</p>
          </div>
          <div className="flex-1 bg-on-surface/5 rounded-xl p-1.5">
            <p className="text-[9px] uppercase text-on-surface-variant font-bold">Overdue</p>
            <p className="text-label-sm font-bold text-error">0</p>
          </div>
          <div className="flex-1 bg-on-surface/5 rounded-xl p-1.5">
            <p className="text-[9px] uppercase text-on-surface-variant font-bold">Active</p>
            <p className="text-label-sm font-bold text-primary">4</p>
          </div>
        </div>
        
        <Link 
          to="/settings" 
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-on-surface/5 transition-all rounded-xl"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="text-label-md font-bold">Settings</span>
        </Link>

        <button 
          onClick={() => {
            setIsHistoryOpen(true);
            onClose?.();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-on-surface/5 transition-all rounded-xl text-left"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          <span className="text-label-md font-bold">History Palette</span>
        </button>

        <Link 
          to="/trash" 
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-on-surface/5 transition-all rounded-xl"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
          <span className="text-label-md font-bold">Trash</span>
        </Link>
      </div>

      <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </aside>
  );
}
