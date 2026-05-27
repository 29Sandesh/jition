import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function EditDashboardPage() {
  const navigate = useNavigate();
  
  const [widgets, setWidgets] = useState([
    { id: 'health', name: 'Project Health', description: 'Overview of active, completed and overdue tasks', enabled: true },
    { id: 'chart', name: 'Task Completion Trajectory', description: 'Area chart showing task progress over time', enabled: true },
    { id: 'milestones', name: 'Next Milestones', description: 'Upcoming project deadlines and releases', enabled: true },
    { id: 'activity', name: 'Recent Activity', description: 'Latest actions by team members', enabled: true },
    { id: 'team', name: 'Team Workload', description: 'Bar chart showing task distribution by member', enabled: false },
    { id: 'budget', name: 'Budget Burn Rate', description: 'Financial tracking for current sprint', enabled: false },
  ]);

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleSave = () => {
    toast.success("Dashboard layout updated");
    navigate('/');
  };

  return (
    <div className="p-gutter max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-8">
        <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Edit Dashboard</h2>
        <p className="text-body-lg text-on-surface-variant">Customize your workspace overview by toggling widgets.</p>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
        <div className="space-y-4">
          {widgets.map((widget) => (
            <div 
              key={widget.id} 
              className={`p-6 border rounded-xl flex items-center justify-between transition-all ${widget.enabled ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'}`}
            >
              <div className="flex items-center gap-4">
                <span className={`material-symbols-outlined text-[24px] ${widget.enabled ? 'text-primary' : 'text-outline'}`}>
                  {widget.enabled ? 'visibility' : 'visibility_off'}
                </span>
                <div>
                  <h4 className="text-label-lg font-bold text-on-surface">{widget.name}</h4>
                  <p className="text-body-sm text-on-surface-variant">{widget.description}</p>
                </div>
              </div>
              
              <button 
                onClick={() => toggleWidget(widget.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${widget.enabled ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${widget.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant flex justify-end gap-3">
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-lg font-bold text-on-surface hover:bg-surface-container-low transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:opacity-90 transition-opacity">
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
}
