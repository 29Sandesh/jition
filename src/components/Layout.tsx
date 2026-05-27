import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import { useAuth } from "../lib/AuthContext";
import { AiAssistantChatbot } from "./AiAssistantChatbot";
import { useStore } from "../lib/store";
import { initFetchInterceptor, startPrefetching } from "../lib/prefetch";
import { InteractiveTutorial } from "./InteractiveTutorial";

export function Layout() {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { selectedWsId } = useStore();

  // Initialize dynamic prefetch cache interceptor
  useEffect(() => {
    initFetchInterceptor();
  }, []);

  // Background prefetching on workspace/session change
  useEffect(() => {
    if (selectedWsId && user) {
      startPrefetching(selectedWsId, user.organisationId || "", user.id);
    }
  }, [selectedWsId, user]);

  useEffect(() => {
    if (!user) return;

    // Connect to global socket.io server
    const socketUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? window.location.origin
      : "https://jition.onrender.com";

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Global notification socket connected!");
    });

    socket.on("activity-notification", (data: any) => {
      // Don't show toast to the user who performed the action
      if (data.userId === user.id) return;

      // Play notification sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch (e) {
        console.error("Failed to play notification sound", e);
      }

      // Save to localStorage
      try {
        const stored = localStorage.getItem("jition-notifications");
        const notifs = stored ? JSON.parse(stored) : [];
        const newNotif = {
          id: Date.now().toString(),
          type: "system",
          title: `${data.userName} ${data.action} "${data.target}"`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false,
          icon: data.action.includes("create") || data.action.includes("add") ? "assignment" : "edit",
          color: data.action.includes("delete") ? "text-red-600" : "text-blue-600",
          bg: data.action.includes("delete") ? "bg-red-100" : "bg-blue-100"
        };
        localStorage.setItem("jition-notifications", JSON.stringify([newNotif, ...notifs].slice(0, 50)));
        window.dispatchEvent(new Event("jition-new-notification"));
      } catch (err) {
        console.error("Failed to store notification", err);
      }

      toast.info(
        `Team Update: ${data.userName} ${data.action} "${data.target}"`,
        {
          description: data.newValue ? `Value: ${data.newValue}` : undefined,
          duration: 5000,
          action: {
            label: "Dismiss",
            onClick: () => {}
          }
        }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <div className="flex bg-background text-on-surface font-sans h-full overflow-hidden relative">
      
      {/* 🔮 Ambient Liquid Glass Shifting Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top Left Glowing Orb */}
        <div className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-primary/15 to-secondary/5 blur-[100px] md:blur-[130px] animate-float-slow opacity-75 dark:opacity-60" />
        
        {/* Bottom Right Glowing Orb */}
        <div className="absolute bottom-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-tertiary/10 to-primary/5 blur-[90px] md:blur-[120px] animate-float-reverse opacity-70 dark:opacity-50" />
        
        {/* Mid Right Golden Highlight Orb */}
        <div className="absolute top-[25%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-r from-primary-fixed-dim/10 to-transparent blur-[80px] md:blur-[100px] opacity-40 animate-float-slow" />
      </div>

      {/* Mobile Drawer Overlay Backing */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer Component */}
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content Layout Container */}
      <main className="flex-1 md:pl-[260px] flex flex-col min-w-0 h-full overflow-hidden z-10">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        
        <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AiAssistantChatbot />
      <InteractiveTutorial />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
