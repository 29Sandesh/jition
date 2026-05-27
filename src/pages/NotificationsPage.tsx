import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useStore } from "../lib/store";
import { useAuth } from "../lib/AuthContext";

const DEFAULT_NOTIFICATIONS = [
  { id: "1", type: "mention", title: "Sarah mentioned you in Q4 Planning", time: "10 mins ago", read: false, icon: "alternate_email", color: "text-blue-600", bg: "bg-blue-100" },
  { id: "2", type: "task", title: "You were assigned to Design System Review", time: "2 hours ago", read: false, icon: "assignment", color: "text-purple-600", bg: "bg-purple-100" },
  { id: "3", type: "system", title: "Project 'Kinetic Alpha' was successfully deployed", time: "1 day ago", read: true, icon: "rocket_launch", color: "text-green-600", bg: "bg-green-100" },
  { id: "4", type: "comment", title: "New comment on API Architecture doc", time: "2 days ago", read: true, icon: "chat_bubble", color: "text-orange-600", bg: "bg-orange-100" },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { selectedWsId, token } = useStore();
  const { user } = useAuth();

  const loadNotifications = async () => {
    try {
      // 1. Fetch real-time database activities
      let dbNotifs: any[] = [];
      if (selectedWsId) {
        const orgId = user?.organisationId || "";
        const headers: any = {
          "x-workspace-id": selectedWsId,
          "x-organisation-id": orgId,
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const res = await fetch("/api/workItems/history", { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.activities && Array.isArray(data.activities)) {
            const readIds = localStorage.getItem("jition-read-notification-ids")
              ? JSON.parse(localStorage.getItem("jition-read-notification-ids")!)
              : [];

            dbNotifs = data.activities.map((act: any) => ({
              id: act.id,
              type: act.action.includes("created") ? "task" : "system",
              title: `${act.user} ${act.action} "${act.target}"`,
              time: act.time,
              read: readIds.includes(act.id),
              icon: act.action.includes("create") || act.action.includes("add") ? "assignment" : "edit",
              color: act.action.includes("delete") ? "text-red-600" : "text-blue-600",
              bg: act.action.includes("delete") ? "bg-red-100" : "bg-blue-100"
            }));
          }
        }
      }

      // 2. Fetch locally stored manual/test notifications
      const stored = localStorage.getItem("jition-notifications");
      let localNotifs = stored ? JSON.parse(stored) : [];

      if (!stored && dbNotifs.length === 0) {
        // Fallback to seeding default mock notifications if completely empty
        localStorage.setItem("jition-notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
        localNotifs = DEFAULT_NOTIFICATIONS;
      }

      // Combine both lists (avoiding duplicates)
      const combined = [...localNotifs];
      dbNotifs.forEach((dbN: any) => {
        if (!combined.some(n => n.id === dbN.id)) {
          combined.push(dbN);
        }
      });

      // Sort by read state (unread first) and then by ID (descending)
      combined.sort((a, b) => {
        if (a.read !== b.read) {
          return a.read ? 1 : -1;
        }
        return b.id.localeCompare(a.id);
      });

      setNotifications(combined);
    } catch (e) {
      console.error("Failed to load notifications from local storage", e);
    }
  };

  useEffect(() => {
    loadNotifications();

    window.addEventListener("jition-new-notification", loadNotifications);
    return () => {
      window.removeEventListener("jition-new-notification", loadNotifications);
    };
  }, [selectedWsId]);

  const markAllRead = () => {
    // 1. Mark local notifications as read
    const stored = localStorage.getItem("jition-notifications");
    const localNotifs = stored ? JSON.parse(stored) : [];
    const updatedLocal = localNotifs.map((n: any) => ({ ...n, read: true }));
    localStorage.setItem("jition-notifications", JSON.stringify(updatedLocal));

    // 2. Save all DB notification IDs to read list in localStorage
    const readIds = localStorage.getItem("jition-read-notification-ids")
      ? JSON.parse(localStorage.getItem("jition-read-notification-ids")!)
      : [];
    
    notifications.forEach((n: any) => {
      if (!readIds.includes(n.id)) {
        readIds.push(n.id);
      }
    });
    localStorage.setItem("jition-read-notification-ids", JSON.stringify(readIds));

    // 3. Dispatch event to update the header
    window.dispatchEvent(new Event("jition-new-notification"));
    toast.success("All notifications marked as read");
    loadNotifications();
  };

  const markRead = (id: string | number) => {
    // 1. Mark local notification as read if it is local
    const stored = localStorage.getItem("jition-notifications");
    const localNotifs = stored ? JSON.parse(stored) : [];
    const updatedLocal = localNotifs.map((n: any) => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem("jition-notifications", JSON.stringify(updatedLocal));

    // 2. Add ID to read list in localStorage
    const readIds = localStorage.getItem("jition-read-notification-ids")
      ? JSON.parse(localStorage.getItem("jition-read-notification-ids")!)
      : [];
    if (!readIds.includes(id)) {
      readIds.push(id);
    }
    localStorage.setItem("jition-read-notification-ids", JSON.stringify(readIds));

    // 3. Dispatch event to update the header
    window.dispatchEvent(new Event("jition-new-notification"));
    loadNotifications();
  };

  const triggerTestNotification = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav");
      audio.volume = 0.4;
      audio.play().catch((err) => console.log("Audio play blocked", err));
    } catch (e) {
      console.error("Audio error", e);
    }

    const newNotif = {
      id: Date.now().toString(),
      type: "system",
      title: "System Test: Notification chime and alerts verified successfully!",
      time: "Just now",
      read: false,
      icon: "notifications_active",
      color: "text-primary",
      bg: "bg-primary/10"
    };

    const stored = localStorage.getItem("jition-notifications");
    const localNotifs = stored ? JSON.parse(stored) : [];
    localStorage.setItem("jition-notifications", JSON.stringify([newNotif, ...localNotifs]));
    window.dispatchEvent(new Event("jition-new-notification"));

    toast.success("Test notification triggered with chime!");
  };

  return (
    <div className="p-gutter max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Notifications</h2>
          <p className="text-body-lg text-on-surface-variant">Stay updated with mentions, tasks, and alerts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={triggerTestNotification}
            className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-label-md hover:bg-primary/95 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            Test Chime
          </button>
          <button onClick={markAllRead} className="px-4 py-2 border border-outline-variant rounded-lg font-bold text-label-md hover:bg-surface-container-low transition-colors text-on-surface">
            Mark all as read
          </button>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-outline-variant">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-6 flex items-start gap-4 transition-colors ${notif.read ? 'bg-white' : 'bg-surface-container-lowest'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}>
                <span className="material-symbols-outlined text-[20px]">{notif.icon}</span>
              </div>
              <div className="flex-1">
                <h4 className={`text-body-lg ${notif.read ? 'font-medium text-on-surface-variant' : 'font-bold text-on-surface'}`}>
                  {notif.title}
                </h4>
                <p className="text-label-sm text-outline mt-1">{notif.time}</p>
              </div>
              {!notif.read && (
                <button 
                  onClick={() => markRead(notif.id)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant"
                  title="Mark as read"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span>
                </button>
              )}
            </div>
          ))}
          {notifications.length === 0 && (
             <div className="p-12 text-center text-on-surface-variant">
               <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">notifications_off</span>
               <p className="text-body-lg">You're all caught up!</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
