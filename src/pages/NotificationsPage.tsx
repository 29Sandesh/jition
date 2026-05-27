import { useState, useEffect } from "react";
import { toast } from "sonner";

const DEFAULT_NOTIFICATIONS = [
  { id: "1", type: "mention", title: "Sarah mentioned you in Q4 Planning", time: "10 mins ago", read: false, icon: "alternate_email", color: "text-blue-600", bg: "bg-blue-100" },
  { id: "2", type: "task", title: "You were assigned to Design System Review", time: "2 hours ago", read: false, icon: "assignment", color: "text-purple-600", bg: "bg-purple-100" },
  { id: "3", type: "system", title: "Project 'Kinetic Alpha' was successfully deployed", time: "1 day ago", read: true, icon: "rocket_launch", color: "text-green-600", bg: "bg-green-100" },
  { id: "4", type: "comment", title: "New comment on API Architecture doc", time: "2 days ago", read: true, icon: "chat_bubble", color: "text-orange-600", bg: "bg-orange-100" },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem("jition-notifications");
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        localStorage.setItem("jition-notifications", JSON.stringify(DEFAULT_NOTIFICATIONS));
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
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
  }, []);

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem("jition-notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event("jition-new-notification"));
    toast.success("All notifications marked as read");
  };

  const markRead = (id: string | number) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem("jition-notifications", JSON.stringify(updated));
    window.dispatchEvent(new Event("jition-new-notification"));
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

    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    localStorage.setItem("jition-notifications", JSON.stringify(updated));
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
