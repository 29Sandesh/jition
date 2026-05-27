import { useState } from "react";

export function ActivityPage() {
  const activities = [
    { id: 1, user: "Alex Morgan", avatar: "A", action: "created a new document", target: "API Architecture Specs", time: "2 hours ago", date: "Today" },
    { id: 2, user: "Sarah Chen", avatar: "S", action: "completed task", target: "Update Dashboard UI", time: "5 hours ago", date: "Today" },
    { id: 3, user: "David Kim", avatar: "D", action: "commented on", target: "Q4 Roadmap", time: "Yesterday at 4:30 PM", date: "Yesterday" },
    { id: 4, user: "Alex Morgan", avatar: "A", action: "invited", target: "Emily Davis to the workspace", time: "Yesterday at 2:15 PM", date: "Yesterday" },
    { id: 5, user: "System", avatar: "sys", action: "deployed", target: "v2.1.0 to Production", time: "Oct 24 at 11:00 AM", date: "October 24, 2023" },
    { id: 6, user: "Sarah Chen", avatar: "S", action: "uploaded", target: "brand-assets.zip", time: "Oct 24 at 9:45 AM", date: "October 24, 2023" },
  ];

  // Group by date
  const grouped = activities.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <div className="p-gutter max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-8">
        <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Activity Log</h2>
        <p className="text-body-lg text-on-surface-variant">Review all recent actions taken across the workspace.</p>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-label-md font-bold text-outline uppercase tracking-wider mb-4 pl-12">{date}</h3>
              <div className="space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 relative">
                    {/* Vertical line connector */}
                    <div className="absolute left-5 top-10 bottom-[-24px] w-px bg-outline-variant last:hidden"></div>
                    
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 z-10 border-4 border-white">
                      {item.avatar === 'sys' ? (
                        <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
                      ) : (
                        <span className="text-label-md font-bold text-on-surface-variant">{item.avatar}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 pt-2">
                      <p className="text-body-lg text-on-surface">
                        <span className="font-bold">{item.user}</span> {item.action} <span className="font-bold text-primary cursor-pointer hover:underline">{item.target}</span>
                      </p>
                      <p className="text-label-sm text-outline mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
