import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  dueDate: string;
}

interface SummaryData {
  completionRate: number;
  overdueTasks: number;
  activeSprints: number;
  avgResponse: string;
  activeTasks: number;
  completed: number;
  onTrack: boolean;
  activeSprintName: string;
  revenue: number;
  burnRate: number;
  workload?: Record<string, number>;
}

const COLORS = {
  P0: "#dc362e", // Error red
  P1: "#ffb400", // Warning orange
  P2: "#727687", // Outline variant
  P3: "#c4c7c5", // Surface outline
};

const sparklineData1 = [{ v: 10 }, { v: 15 }, { v: 12 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 25 }, { v: 35 }];
const sparklineData2 = [{ v: 8 }, { v: 6 }, { v: 9 }, { v: 4 }, { v: 3 }, { v: 5 }, { v: 2 }, { v: 1 }];
const sparklineData3 = [{ v: 40 }, { v: 45 }, { v: 42 }, { v: 48 }, { v: 55 }, { v: 50 }, { v: 60 }, { v: 65 }];

function KPICard({ title, value, trend, trendUp, sparklineData, sparklineColor }: { title: string, value: string | number, trend: string, trendUp: boolean, sparklineData: any[], sparklineColor: string }) {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group">
      <div className="relative z-10 flex flex-col h-full justify-between">
         <span className="text-label-sm font-bold text-outline uppercase tracking-wider mb-2 block">{title}</span>
         <div className="flex items-end justify-between">
            <span className="text-[32px] font-headline-xl text-on-surface leading-none">{value}</span>
            <div className={cn("flex items-center gap-1 text-label-sm font-bold px-2 py-0.5 rounded-full border", trendUp ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
               <span className="material-symbols-outlined text-[14px]">{trendUp ? "trending_up" : "trending_down"}</span>
               {trend}
            </div>
         </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[60px] opacity-20 group-hover:opacity-40 transition-opacity">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor={sparklineColor} stopOpacity={0.8}/>
                   <stop offset="95%" stopColor={sparklineColor} stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <Area type="monotone" dataKey="v" stroke={sparklineColor} fillOpacity={1} fill={`url(#grad-${title.replace(/\s+/g, '')})`} strokeWidth={2} />
            </AreaChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}


export function Dashboard() {
  const { organisation, user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState("Last 30 Days");

  useEffect(() => {
    const authHeaders = {
      "x-workspace-id": "default-workspace-id", // Hardcoded for now until workspace selector is built
      "x-organisation-id": organisation?.id || user?.organisationId || ""
    };

    Promise.all([
      fetch("/api/workItems", { headers: authHeaders }).then(r => r.json()).then(data => data.data || data.items || []),
      fetch("/api/dashboard/summary", { headers: authHeaders }).then(r => r.json()).catch(() => null),
      fetch("/api/organisations/members", { headers: authHeaders }).then(r => r.json()).catch(() => []),
    ]).then(([tasksData, summaryData, membersData]) => {
      const rawTasks = Array.isArray(tasksData) ? tasksData : [];
      const mappedTasks = rawTasks.map((t: any) => ({ ...t, id: t._id || t.id }));
      setTasks(mappedTasks);
      setSummary(summaryData);
      setMembers(Array.isArray(membersData) ? membersData : []);
    }).catch(err => console.error(err));
  }, []);

  if (!summary || (summary as any).error) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center min-h-[500px] gap-4">
        <span className="material-symbols-outlined text-[64px] text-outline-variant animate-pulse mb-2">dashboard_customize</span>
        <h3 className="text-headline-sm font-bold text-on-surface">Initializing Dashboard...</h3>
        <p className="text-on-surface-variant max-w-md text-center text-body-md">
          {summary && (summary as any).error ? (summary as any).error : "Preparing your workspace and loading items."}
        </p>
        {summary && (summary as any).error && (
          <button 
            onClick={() => navigate("/settings")} 
            className="px-6 py-2.5 bg-primary text-white rounded-full font-bold shadow hover:bg-primary/90 transition-all mt-2"
          >
            Go to Settings
          </button>
        )}
      </div>
    );
  }

  const urgentTasks = tasks.filter(t => t.priority === "P0" && t.status !== "Done");
  
  // Prepare Doughnut Chart Data
  const priorityCount = { P0: 0, P1: 0, P2: 0, P3: 0 };
  tasks.filter(t => t.status !== "Done").forEach(t => {
     if (priorityCount[t.priority as keyof typeof priorityCount] !== undefined) {
        priorityCount[t.priority as keyof typeof priorityCount]++;
     }
  });
  const pieData = [
     { name: "P0 - Critical", value: priorityCount.P0, color: COLORS.P0 },
     { name: "P1 - High", value: priorityCount.P1, color: COLORS.P1 },
     { name: "P2 - Normal", value: priorityCount.P2, color: COLORS.P2 },
     { name: "P3 - Low", value: priorityCount.P3, color: COLORS.P3 },
  ].filter(d => d.value > 0);

  const activeTaskTotal = pieData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Header & Time Controls */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <nav className="flex text-label-sm font-label-sm text-outline mb-1 gap-1">
            <span>Workspace</span><span>/</span><span className="text-on-surface">{organisation?.name || "The CirCle"}</span>
          </nav>
          <h2 className="text-headline-xl font-headline-xl text-on-surface font-bold tracking-tight">Enterprise Command</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-label-md font-bold text-on-surface cursor-pointer hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <select 
               value={timeRange} 
               onChange={(e) => { setTimeRange(e.target.value); toast.success(`Data filtered by ${e.target.value}`); }}
               className="bg-transparent border-none outline-none cursor-pointer"
            >
               <option>Last 7 Days</option>
               <option>Last 30 Days</option>
               <option>This Quarter</option>
               <option>All Time</option>
            </select>
          </div>
          <button onClick={() => navigate("/edit-dashboard")} className="p-2 border border-outline-variant bg-white text-on-surface rounded-lg hover:bg-surface-container-low transition-colors shadow-sm">
             <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
         <KPICard title="Sprint Velocity" value="42 pts" trend="+12%" trendUp={true} sparklineData={sparklineData1} sparklineColor="#0050cb" />
         <KPICard title="Active Tasks" value={summary.activeTasks} trend="-5%" trendUp={true} sparklineData={sparklineData3} sparklineColor="#0050cb" />
         <KPICard title="Open Bugs (P0/P1)" value={priorityCount.P0 + priorityCount.P1} trend="+2%" trendUp={false} sparklineData={sparklineData2} sparklineColor="#dc362e" />
         <KPICard title="Completion Rate" value={`${summary.completionRate}%`} trend={summary.completionRate >= 50 ? "Healthy" : "Needs Focus"} trendUp={summary.completionRate >= 50} sparklineData={sparklineData1} sparklineColor={summary.completionRate >= 50 ? "#059669" : "#dc362e"} />
      </div>

      {/* Main Grid: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
         {/* Urgent Action Mini-Table */}
         <div className="lg:col-span-2 glass-panel border-error/30 rounded-2xl shadow-lg flex flex-col h-[400px] overflow-hidden">
            <div className="p-5 border-b border-error/10 bg-error/5 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error animate-pulse">warning</span>
                  <h3 className="text-headline-sm font-headline-sm text-error font-bold">Urgent Action Required (P0)</h3>
               </div>
               <span className="px-2.5 py-1 bg-error text-white text-label-sm font-bold rounded-full">{urgentTasks.length} items</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-lowest sticky top-0 z-10 border-b border-outline-variant/50">
                     <tr className="text-label-sm uppercase tracking-wider text-outline">
                        <th className="p-4 font-bold">ID</th>
                        <th className="p-4 font-bold">Blocker</th>
                        <th className="p-4 font-bold">Due Date</th>
                        <th className="p-4 font-bold text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     {urgentTasks.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-outline font-medium">No urgent tasks. You're all clear!</td></tr>
                     ) : urgentTasks.map(task => (
                        <tr key={task.id} className="border-b border-outline-variant/30 hover:bg-error/5 transition-colors group">
                           <td className="p-4 text-label-md text-on-surface-variant font-bold">{(task.id || "").substring(Math.max(0, (task.id || "").length - 6))}</td>
                           <td className="p-4 text-body-md font-semibold text-on-surface group-hover:text-error transition-colors">{task.title}</td>
                           <td className="p-4 text-label-md text-error font-bold">{task.dueDate}</td>
                           <td className="p-4 text-right">
                              <button onClick={() => navigate("/tasks")} className="px-3 py-1.5 border border-error text-error rounded font-label-sm hover:bg-error hover:text-white transition-colors">Resolve</button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Priority Distribution */}
         <div className="lg:col-span-1 glass-panel rounded-2xl p-6 shadow-lg flex flex-col h-[400px]">
            <h3 className="text-headline-sm font-headline-sm text-on-surface mb-2">Priority Distribution</h3>
            <p className="text-body-md text-outline mb-4">Breakdown of all active tasks in the current sprint.</p>
            <div className="flex-1 relative flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                     </Pie>
                     <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[36px] font-bold text-on-surface leading-none">{activeTaskTotal}</span>
                  <span className="text-label-sm text-outline uppercase tracking-widest mt-1">Total</span>
               </div>
            </div>
         </div>
      </div>


      {/* Floating Action Hub */}
      <div className="fixed bottom-8 right-8 flex gap-3 z-50">
         <button onClick={() => navigate("/tasks")} className="flex items-center justify-center w-12 h-12 rounded-xl glass-panel shadow-2xl hover:-translate-y-1 active:scale-95 transition-all group">
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">add_task</span>
         </button>
         <button onClick={() => navigate("/docs")} className="flex items-center justify-center w-12 h-12 rounded-xl glass-panel shadow-2xl hover:-translate-y-1 active:scale-95 transition-all group">
            <span className="material-symbols-outlined group-hover:text-primary transition-colors">note_add</span>
         </button>
      </div>
    </div>
  );
}
