import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export function NewPagePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("blank");
  const [visibility, setVisibility] = useState("workspace");
  const [isCreating, setIsCreating] = useState(false);

  const templates = [
    { id: "blank", name: "Blank Page", icon: "draft", desc: "Start from scratch" },
    { id: "meeting", name: "Meeting Notes", icon: "groups", desc: "Standard template for syncs" },
    { id: "prd", name: "Product Requirements", icon: "architecture", desc: "Specs and scoping" },
    { id: "retro", name: "Retrospective", icon: "published_with_changes", desc: "Sprint review format" },
    { id: "brief", name: "Project Brief", icon: "assignment", desc: "Executive summary and goals" },
    { id: "specs", name: "Engineering Specs", icon: "code", desc: "Technical design document" },
  ];

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Please enter a page title");
      return;
    }
    
    setIsCreating(true);
    
    const emojiMap: Record<string, string> = {
      blank: "📝", meeting: "👥", prd: "📋", retro: "🔄", brief: "📌", specs: "⚙️"
    };

    setTimeout(() => {
      setIsCreating(false);
      toast.success(`Created page: ${title}`);
      navigate("/docs", { 
        state: { 
          newPage: { 
            title, 
            template, 
            emoji: emojiMap[template] || "📄" 
          } 
        } 
      });
    }, 800);
  };

  const renderPreview = () => {
    const previewContent = {
      blank: (
        <div className="space-y-4 w-full">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          <div className="h-4 bg-gray-100 rounded w-4/6"></div>
        </div>
      ),
      meeting: (
        <div className="space-y-4 w-full">
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="flex items-center gap-2 mb-6">
             <div className="w-6 h-6 rounded-full bg-blue-100"></div>
             <div className="w-6 h-6 rounded-full bg-green-100 -ml-2"></div>
             <div className="h-4 bg-gray-100 rounded w-24 ml-2"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="pl-4 border-l-2 border-gray-200 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full"></div>
            <div className="h-3 bg-gray-100 rounded w-5/6"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-1/4 mt-4 mb-2"></div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gray-300"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      ),
      prd: (
        <div className="space-y-4 w-full">
          <div className="h-8 bg-gray-200 rounded w-full mb-6"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="h-16 bg-gray-50 border border-gray-100 rounded p-2"><div className="h-3 w-1/2 bg-gray-200 rounded mb-2"></div><div className="h-4 w-1/3 bg-blue-200 rounded"></div></div>
             <div className="h-16 bg-gray-50 border border-gray-100 rounded p-2"><div className="h-3 w-1/2 bg-gray-200 rounded mb-2"></div><div className="h-4 w-3/4 bg-green-200 rounded"></div></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-20 bg-gray-100 rounded w-full"></div>
        </div>
      ),
      retro: (
        <div className="space-y-4 w-full">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="grid grid-cols-3 gap-3">
             <div className="space-y-2">
               <div className="h-5 bg-green-100 rounded w-full mb-2"></div>
               <div className="h-12 bg-gray-50 border border-gray-100 rounded"></div>
             </div>
             <div className="space-y-2">
               <div className="h-5 bg-red-100 rounded w-full mb-2"></div>
               <div className="h-12 bg-gray-50 border border-gray-100 rounded"></div>
             </div>
             <div className="space-y-2">
               <div className="h-5 bg-blue-100 rounded w-full mb-2"></div>
               <div className="h-12 bg-gray-50 border border-gray-100 rounded"></div>
             </div>
          </div>
        </div>
      ),
      brief: (
        <div className="space-y-4 w-full">
           <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
           <div className="h-4 bg-gray-100 rounded w-1/4 mb-6"></div>
           <div className="h-24 bg-surface-container-low rounded w-full mb-4"></div>
           <div className="h-4 bg-gray-100 rounded w-full"></div>
           <div className="h-4 bg-gray-100 rounded w-full"></div>
        </div>
      ),
      specs: (
        <div className="space-y-4 w-full font-mono">
           <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
           <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
           <div className="p-3 bg-gray-900 rounded space-y-2">
             <div className="h-3 bg-blue-400 rounded w-1/2"></div>
             <div className="h-3 bg-green-400 rounded w-3/4"></div>
             <div className="h-3 bg-gray-400 rounded w-1/3"></div>
           </div>
        </div>
      )
    };

    return previewContent[template as keyof typeof previewContent] || previewContent.blank;
  };

  return (
    <div className="p-gutter h-full flex flex-col max-w-[1200px] mx-auto w-full">
      <div className="mb-8 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 text-label-sm uppercase tracking-widest text-on-surface-variant mb-2">
             <button onClick={() => navigate(-1)} className="hover:text-primary transition-colors flex items-center gap-1">
               <span className="material-symbols-outlined text-[14px]">arrow_back</span> Back
             </button>
             <span className="material-symbols-outlined text-[14px]">chevron_right</span>
             <span className="text-primary font-bold">New Document</span>
          </div>
          <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight">Create New Page</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg font-bold text-label-md text-on-surface hover:bg-surface-container-low transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleCreate} 
            disabled={isCreating}
            className="px-6 py-2.5 rounded-lg font-bold text-label-md bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-2 min-w-[140px] justify-center shadow-sm disabled:opacity-70"
          >
            {isCreating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Page
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 pb-8">
        {/* Configuration Panel */}
        <div className="w-[55%] flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
            <label className="block text-title-md font-bold text-on-surface mb-3">Page Title</label>
            <input 
              type="text" 
              placeholder="Untitled Document" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-4 text-headline-sm font-bold border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-outline-variant/50 transition-all" 
              autoFocus
            />
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
             <div className="w-full">
                <label className="block text-label-md font-bold text-on-surface mb-3">Visibility</label>
                <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant">
                   <button 
                     onClick={() => setVisibility("workspace")} 
                     className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-label-sm transition-all", visibility === "workspace" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}
                   >
                      <span className="material-symbols-outlined text-[16px]">public</span> Workspace
                   </button>
                   <button 
                     onClick={() => setVisibility("private")} 
                     className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-label-sm transition-all", visibility === "private" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface")}
                   >
                      <span className="material-symbols-outlined text-[16px]">lock</span> Private
                   </button>
                </div>
             </div>
          </div>

          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm flex-1">
            <label className="block text-title-md font-bold text-on-surface mb-4">Select Template</label>
            <div className="grid grid-cols-2 gap-4">
              {templates.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                     "p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-4 relative overflow-hidden group",
                     template === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant hover:border-outline bg-white hover:shadow-sm'
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors", template === t.id ? 'bg-primary text-white shadow-sm' : 'bg-surface-container-low text-on-surface-variant group-hover:bg-surface-container-high')}>
                    <span className="material-symbols-outlined text-[24px]">{t.icon}</span>
                  </div>
                  <div>
                    <h4 className={cn("text-label-lg font-bold mb-0.5", template === t.id ? 'text-primary' : 'text-on-surface')}>{t.name}</h4>
                    <p className="text-body-sm text-on-surface-variant">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="w-[45%] bg-surface-container-lowest border border-outline-variant rounded-2xl flex flex-col overflow-hidden shadow-sm">
           <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">preview</span>
              <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Live Preview</span>
           </div>
           
           <div className="flex-1 p-8 bg-[#f8f9fa] flex items-center justify-center relative overflow-hidden">
             {/* Decorative elements */}
             <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent opacity-50"></div>
             
             <AnimatePresence mode="wait">
               <motion.div
                 key={template}
                 initial={{ opacity: 0, y: 20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: -20, scale: 0.95 }}
                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 className="w-full max-w-md aspect-[1/1.2] bg-white rounded-xl shadow-lg border border-gray-200 p-8 flex flex-col"
               >
                 {/* Mini Document Header */}
                 <div className="border-b border-gray-100 pb-6 mb-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[24px] text-gray-400">
                          {templates.find(t => t.id === template)?.icon}
                       </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 break-words leading-tight">
                       {title || "Untitled Document"}
                    </h1>
                 </div>
                 
                 {/* Mini Document Content */}
                 <div className="flex-1 opacity-80">
                    {renderPreview()}
                 </div>
               </motion.div>
             </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}
