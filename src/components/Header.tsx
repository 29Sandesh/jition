import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useSettings } from "../lib/SettingsContext";
import { cn } from "../lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, company, logout } = useAuth();
  const { workspaceName } = useSettings();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  // Generate dynamic breadcrumb segments based on path
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const getPageTitle = (segment: string) => {
    if (segment === "docs") return "Docs Pages";
    if (segment === "planner") return "Sprint Planner";
    if (segment === "hierarchy") return "Hierarchy Tree";
    if (segment === "messages") return "Messages Hub";
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const handleShareLink = () => {
    const inviteUrl = `${window.location.origin}/auth?register=true&company=${company?.name || workspaceName || "org"}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => {
        toast.success("Workspace invite link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy invite link");
      });
  };

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center w-full px-gutter h-16 glass-header">
      
      {/* Left side: Hamburger Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile Menu Icon */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-on-surface-variant hover:bg-on-surface/10 active:scale-95 transition-all rounded-full flex items-center justify-center"
          title="Open Menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-label-md font-bold text-on-surface-variant select-none overflow-hidden truncate">
          <span className="text-on-surface hover:text-primary transition-colors cursor-pointer hidden sm:inline">The CirCle</span>
          <span className="material-symbols-outlined text-[16px] text-outline-variant hidden sm:inline">chevron_right</span>
          
          <span className="text-on-surface hover:text-primary transition-colors cursor-pointer truncate max-w-[120px] sm:max-w-none">
            {workspaceName || company?.name || "Workspace"}
          </span>
          
          {pathSegments.length > 0 && (
            <>
              <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
              <span className="text-primary truncate">
                {getPageTitle(pathSegments[0])}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side: Share, Actions & Profile menu */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Copy Invite / Share Link */}
        <button 
          onClick={handleShareLink}
          className="p-2 text-on-surface-variant hover:bg-on-surface/5 active:scale-95 transition-all rounded-full flex items-center justify-center gap-1.5 font-bold text-label-sm border border-outline-variant/30 bg-surface/5 px-3"
          title="Copy invite URL"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          <span className="hidden sm:inline">Share Workspace</span>
        </button>

        <div className="h-6 w-[1px] bg-outline-variant/40 mx-0.5"></div>

        <Link 
          to="/notifications" 
          className="p-2 text-on-surface-variant hover:bg-on-surface/5 transition-colors rounded-full flex items-center justify-center"
          title="Notifications"
        >
          <span className="material-symbols-outlined">notifications</span>
        </Link>
        
        <Link 
          to="/help" 
          className="p-2 text-on-surface-variant hover:bg-on-surface/5 transition-colors rounded-full flex items-center justify-center"
          title="Help Guide"
        >
          <span className="material-symbols-outlined">help</span>
        </Link>

        <div className="h-6 w-[1px] bg-outline-variant/40 mx-0.5"></div>

        {/* User Profile Squirclish Menu */}
        <div 
          ref={dropdownRef}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 relative cursor-pointer select-none"
        >
          <div className="text-right hidden lg:block">
            <p className="text-label-sm font-bold text-on-surface leading-tight truncate max-w-[120px]">{company?.name || workspaceName}</p>
            <p className="text-[9px] uppercase font-bold tracking-wider text-on-surface-variant leading-none mt-0.5">{user?.role}</p>
          </div>
          
          <div className="w-8.5 h-8.5 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-label-md shadow-md hover:scale-105 transition-transform overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (user?.name || "U")[0].toUpperCase()
            )}
          </div>

          {/* Click Sign Out Panel */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-full right-0 mt-2 w-48 glass-panel rounded-xl shadow-2xl transition-all duration-200 z-50 overflow-hidden border border-outline-variant",
              isDropdownOpen 
                ? "opacity-100 pointer-events-auto transform translate-y-0" 
                : "opacity-0 pointer-events-none transform translate-y-1"
            )}
          >
             <div className="px-4 py-2 bg-on-surface/5 border-b border-outline-variant/30">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant">Active Session</p>
                <p className="text-label-sm font-bold text-on-surface truncate">{user?.name || user?.email}</p>
             </div>
             
             <Link 
               to="/settings" 
               className="w-full text-left px-4 py-3 text-on-surface text-label-md hover:bg-on-surface/5 flex items-center gap-2 transition-colors"
             >
               <span className="material-symbols-outlined text-[18px]">settings</span>
               Settings
             </Link>

             <button 
               onClick={logout}
               className="w-full text-left px-4 py-3 text-error font-bold text-label-md hover:bg-error/10 flex items-center gap-2 transition-colors border-t border-outline-variant/30"
             >
               <span className="material-symbols-outlined text-[18px]">logout</span>
               Sign Out
             </button>
          </div>
        </div>
      </div>
    </header>
  );
}
