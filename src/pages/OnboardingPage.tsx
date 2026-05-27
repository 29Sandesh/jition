import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export function OnboardingPage() {
  const { user, refreshAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (user?.companyId) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/companies/search?q=${q}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestJoin = async (companyId: string) => {
    try {
      const res = await fetch("/api/companies/join-request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "" 
        },
        body: JSON.stringify({ companyId })
      });
      if (res.ok) {
        toast.success("Join request sent!");
        setHasPending(true);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send request");
        if (error.error?.includes("already have a pending request")) {
           setHasPending(true);
        }
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen w-full bg-surface-container-lowest flex flex-col items-center justify-center p-6 py-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />

      {/* Top Bar with Logout */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border border-primary/50" />
          </div>
          <span className="font-bold text-title-md tracking-tight text-on-surface">The CirCle</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant font-bold text-label-sm"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-12 items-center z-10 mt-12">
        
        {/* Left Side: Tutorial / Walkthrough */}
        <div className="space-y-8">
          <div>
            <h1 className="text-display-sm font-headline-xl font-bold text-on-surface mb-2">
              Welcome, {user?.name.split(" ")[0]}! 👋
            </h1>
            <p className="text-body-lg text-on-surface-variant">
              You're almost ready to start collaborating. Here's a quick guide on how The CirCle works.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <span className="material-symbols-outlined">domain</span>
              </div>
              <div>
                <h3 className="text-title-md font-bold text-on-surface mb-1">1. Join a Workspace</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Search for your company on the right and request access. A Lead must approve you before you can enter.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <span className="material-symbols-outlined">assignment</span>
              </div>
              <div>
                <h3 className="text-title-md font-bold text-on-surface mb-1">2. Get Assigned Tasks</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Once inside, Leads will assign tasks to you. You can only view and edit tasks that you have been granted access to.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                <span className="material-symbols-outlined">history</span>
              </div>
              <div>
                <h3 className="text-title-md font-bold text-on-surface mb-1">3. Track Your Impact</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Every action you take—updating a task, moving a card—is logged in the History Palette for full transparency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Area (Search or Pending) */}
        <div>
          <AnimatePresence mode="wait">
            {hasPending ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-white rounded-3xl shadow-xl border border-outline-variant p-8 text-center"
              >
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-[40px] text-amber-500 animate-pulse">hourglass_empty</span>
                </div>
                <h2 className="text-headline-sm font-bold text-on-surface mb-3">Awaiting Approval</h2>
                <p className="text-body-md text-on-surface-variant mb-6">
                  Your request has been sent to the workspace Lead. You will automatically be redirected here once they approve your request.
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={refreshAuth}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-label-md hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                    Check Status Now
                  </button>
                  <p className="text-label-sm text-on-surface-variant">
                    If this takes too long, you can sign out and contact your Lead.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-white rounded-3xl shadow-xl border border-outline-variant p-8"
              >
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-[32px] text-primary">search</span>
                  </div>
                  <h2 className="text-headline-sm font-bold text-on-surface mb-2">Find Your Workspace</h2>
                  <p className="text-body-sm text-on-surface-variant">Search for your company by name to request access.</p>
                </div>
                
                <div className="relative mb-6">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">business</span>
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="E.g., StartAPPSS"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-on-surface"
                  />
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {results.length > 0 ? results.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary/30 transition-colors group">
                      <div>
                        <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{comp.name}</p>
                        <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">ID: {comp.id}</p>
                      </div>
                      <button 
                        onClick={() => handleRequestJoin(comp.id)}
                        className="px-5 py-2 bg-primary text-white text-label-sm font-bold rounded-lg hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        Request Join
                      </button>
                    </div>
                  )) : search.length > 1 ? (
                    <div className="text-center py-8 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
                      <span className="material-symbols-outlined text-[32px] text-outline-variant mb-2">domain_disabled</span>
                      <p className="text-label-md font-bold text-on-surface-variant">No companies found.</p>
                      <p className="text-[12px] text-outline mt-1">Check the spelling and try again.</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
                      <p className="text-label-sm font-medium text-on-surface-variant">Start typing to see results...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
