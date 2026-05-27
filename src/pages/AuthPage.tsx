import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export function AuthPage() {
  const { user, login, signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [inviteCompany, setInviteCompany] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("register") === "true") {
      setIsSignUp(true);
    }
    const companyParam = params.get("company");
    if (companyParam) {
      setInviteCompany(companyParam);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.companyId) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (isSignUp && !name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setFormLoading(true);
    let success = false;
    if (isSignUp) {
      success = await signup(name.trim(), email.trim(), password, inviteCompany || undefined);
    } else {
      success = await login(email.trim(), password);
    }
    setFormLoading(false);
  };

  const handlePrefill = async (demoEmail: string, autoSubmit = false) => {
    setEmail(demoEmail);
    setPassword("password");
    toast.success(`Prefilled: ${demoEmail}`);
    setShowDemoInfo(false);

    if (autoSubmit) {
      setFormLoading(true);
      const success = await login(demoEmail, "password");
      setFormLoading(false);
      if (success) {
        toast.success(`Welcome back! Logged in as ${demoEmail}`);
      }
    }
  };

  const demoAccounts = [
    { 
      name: "StartAPPss Owner", 
      email: "owner@startappss.io", 
      role: "Owner", 
      workspace: "All Workspaces", 
      desc: "Super Admin with full access across the entire hierarchy.",
      color: "from-rose-500/20 to-red-600/20 border-rose-500/30 text-rose-300",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30"
    },
    { 
      name: "StartAPPss Admin", 
      email: "admin@startappss.io", 
      role: "Admin", 
      workspace: "All Workspaces", 
      desc: "Organisation admin. Can manage settings & members.",
      color: "from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-300",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    { 
      name: "StartAPPss Lead (Manager)", 
      email: "lead@startappss.io", 
      role: "Lead", 
      workspace: "Engineering & Design", 
      desc: "Project Lead with editor rights to manage boards.",
      color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-300",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    { 
      name: "StartAPPss Editor (Eng)", 
      email: "editor_eng@startappss.io", 
      role: "Editor", 
      workspace: "Product Engineering", 
      desc: "Developer with editing rights in Engineering workspace.",
      color: "from-teal-500/20 to-emerald-600/20 border-teal-500/30 text-teal-300",
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30"
    },
    { 
      name: "StartAPPss Editor (Design)", 
      email: "editor_design@startappss.io", 
      role: "Editor", 
      workspace: "Design & Marketing", 
      desc: "Designer with editing rights in Design workspace.",
      color: "from-purple-500/20 to-fuchsia-600/20 border-purple-500/30 text-purple-300",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30"
    },
    { 
      name: "StartAPPss Member (Eng)", 
      email: "member_eng@startappss.io", 
      role: "Member", 
      workspace: "Product Engineering", 
      desc: "Standard developer access in Engineering workspace.",
      color: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-300",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
    },
    { 
      name: "StartAPPss Member (Design)", 
      email: "member_design@startappss.io", 
      role: "Member", 
      workspace: "Design & Marketing", 
      desc: "Standard designer access in Design workspace.",
      color: "from-pink-500/20 to-rose-600/20 border-pink-500/30 text-pink-300",
      badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30"
    },
    { 
      name: "StartAPPss Guest (Eng)", 
      email: "guest_eng@startappss.io", 
      role: "Guest", 
      workspace: "Product Engineering", 
      desc: "Limited guest/contractor access in Engineering.",
      color: "from-slate-500/20 to-zinc-600/20 border-slate-500/30 text-slate-300",
      badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30"
    },
    { 
      name: "StartAPPss Viewer", 
      email: "viewer_all@startappss.io", 
      role: "Viewer", 
      workspace: "All Workspaces", 
      desc: "Read-only access across the entire organisation.",
      color: "from-gray-500/20 to-slate-600/20 border-gray-500/30 text-gray-300",
      badgeColor: "bg-gray-500/20 text-gray-300 border-gray-500/30"
    },
    { 
      name: "StartAPPss Auditor", 
      email: "audit_officer@startappss.io", 
      role: "Auditor", 
      workspace: "All Workspaces", 
      desc: "Auditor profile with admin access for compliance checks.",
      color: "from-violet-500/20 to-purple-600/20 border-violet-500/30 text-violet-300",
      badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30"
    },
  ];

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-label-md font-bold text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate password strength
  let passwordStrength = 0;
  if (password.length > 0) passwordStrength++;
  if (password.length > 5) passwordStrength++;
  if (password.length > 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) passwordStrength++;

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-background">
      
      {/* LEFT PANEL - Dark Hero (Hidden on very small screens, 40% width on md+) */}
      <div className="hidden md:flex w-[40%] bg-gradient-to-br from-[#0f0c29] via-[#201a47] to-[#302b63] p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-500/20 rounded-full blur-[120px]" />

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/80 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border border-white/50" />
            </div>
            <span className="text-white font-bold text-title-lg tracking-tight">The CirCle</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-white text-display-md font-headline-xl font-bold leading-tight mb-4">
              Your team.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Your flow.</span>
            </h1>
            <p className="text-white/70 text-body-lg max-w-md">
              The ultimate workspace for modern teams to assign tasks, track history, and collaborate effortlessly.
            </p>
          </motion.div>

          <div className="mt-12 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 text-white"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
              <p className="font-medium">Assign & track tasks in real time</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 text-white"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                <span className="material-symbols-outlined">account_tree</span>
              </div>
              <p className="font-medium">Company-wide hierarchy system</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 text-white"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-300">
                <span className="material-symbols-outlined">history</span>
              </div>
              <p className="font-medium">Full activity history palette</p>
            </motion.div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="relative z-10 flex -space-x-4 mt-12"
        >
          {["bg-blue-700", "bg-purple-700", "bg-pink-700", "bg-green-700"].map((color, i) => (
            <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#1a153a] ${color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
              {['SA', 'RS', 'AM', 'PN'][i]}
            </div>
          ))}
          <div className="w-12 h-12 rounded-full border-2 border-[#1a153a] bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-sm">
            +3
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - Clean Form (60% width) */}
      <div className="w-full md:w-[60%] flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        <div className="w-full max-w-[440px]">
          
          {/* Mobile Brand Header */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border border-primary/50" />
            </div>
            <span className="text-on-surface font-bold text-title-md tracking-tight">The CirCle</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-headline-md font-bold text-on-surface tracking-tight mb-2">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {isSignUp ? "Join The CirCle to start collaborating." : "Enter your details to access your workspace."}
            </p>
          </div>

          {/* Pill Tab Switcher */}
          <div className="flex bg-surface-container-lowest border border-outline-variant/50 p-1 rounded-2xl mb-8 relative">
            <motion.div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-xl"
              animate={{ left: isSignUp ? "calc(50% + 0px)" : "4px" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => { setIsSignUp(false); toast.info("Switching to Sign In"); }}
              className={`flex-1 py-3 text-label-md font-bold z-10 transition-colors ${!isSignUp ? "text-white" : "text-on-surface-variant"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); toast.info("Switching to Sign Up"); }}
              className={`flex-1 py-3 text-label-md font-bold z-10 transition-colors ${isSignUp ? "text-white" : "text-on-surface-variant"}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium"
                      required={isSignUp}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium"
                required
              />
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {isSignUp && password.length > 0 && (
              <div className="flex gap-1 mt-2">
                <div className={`h-1.5 flex-1 rounded-full ${passwordStrength >= 1 ? 'bg-error' : 'bg-surface-container-high'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${passwordStrength >= 2 ? 'bg-amber-400' : 'bg-surface-container-high'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${passwordStrength >= 3 ? 'bg-green-500' : 'bg-surface-container-high'}`} />
              </div>
            )}

            {!isSignUp && (
              <div className="flex justify-end">
                <button type="button" className="text-label-sm font-bold text-primary hover:underline">Forgot password?</button>
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-label-lg hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
            >
              {formLoading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-outline-variant/50"></div>
              <span className="px-4 text-label-sm text-on-surface-variant">or continue with</span>
              <div className="flex-1 h-px bg-outline-variant/50"></div>
            </div>

            <div className="flex gap-4">
              <a 
                href="/api/auth/google"
                className="flex-1 py-3.5 border border-outline-variant/50 rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-lowest hover:border-primary/50 transition-all font-bold text-label-md text-on-surface"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" role="presentation" className="w-5 h-5" />
                Google
              </a>
              <a 
                href="/api/auth/github"
                className="flex-1 py-3.5 border border-outline-variant/50 rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-lowest hover:border-primary/50 transition-all font-bold text-label-md text-on-surface"
              >
                <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="" role="presentation" className="w-5 h-5" />
                GitHub
              </a>
            </div>
          </form>


        </div>
      </div>

      {/* Floating Trigger Badge on Left Edge */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ scale: 1.05, x: 2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDemoInfo(true)}
        className="fixed left-0 top-[40%] -translate-y-1/2 z-40 bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 backdrop-blur-md border border-white/20 text-white pl-4 pr-3 py-4 rounded-r-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 group"
      >
        <span className="material-symbols-outlined text-white animate-pulse group-hover:scale-110 transition-transform">group</span>
        <span className="[writing-mode:vertical-lr] text-[11px] font-bold tracking-widest text-white/90 uppercase select-none">StartAPPSS Team</span>
      </motion.button>

      {/* Floating Drawer Modal */}
      <AnimatePresence>
        {showDemoInfo && (
          <>
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDemoInfo(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Glass Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 h-full w-[420px] max-w-[90vw] bg-gradient-to-b from-[#09071c]/95 via-[#120d2b]/95 to-[#1a1438]/95 backdrop-blur-2xl border-r border-white/10 z-50 p-6 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] text-white"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-blue-400">
                    <span className="material-symbols-outlined text-[24px]">group</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-title-md text-white tracking-tight">StartAPPSS Team</h3>
                    <p className="text-[11px] text-white/60">Demo Profiles & Permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDemoInfo(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Drawer Body - Scrollable Profiles */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
                <p className="text-[12px] text-white/70 mb-4 bg-white/5 border border-white/10 p-3 rounded-xl leading-relaxed">
                  💡 Select a card to fill the form, or click the <span className="text-blue-400 font-bold">Sign In</span> icon to log in instantly. Standard password is <span className="font-mono text-purple-300">password</span>.
                </p>

                {demoAccounts.map((acc, i) => {
                  const initials = acc.name
                    .replace("StartAPPss ", "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2);
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.015, x: 2 }}
                      className={cn(
                        "relative group flex flex-col p-4 rounded-2xl border bg-gradient-to-r transition-all duration-300 cursor-pointer overflow-hidden",
                        acc.color
                      )}
                      onClick={() => handlePrefill(acc.email, false)}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border shadow-inner",
                            acc.badgeColor
                          )}>
                            {initials}
                          </div>
                          <div>
                            <h4 className="font-bold text-body-md text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-200 transition-all leading-tight">
                              {acc.name}
                            </h4>
                            <p className="text-[11px] text-white/50 font-mono mt-0.5">{acc.email}</p>
                          </div>
                        </div>

                        {/* Instant login action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrefill(acc.email, true);
                          }}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all shadow-md group/btn cursor-pointer"
                          title="Instant Auto Sign In"
                        >
                          <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-0.5 transition-transform">login</span>
                        </button>
                      </div>

                      {/* Description & metadata */}
                      <p className="text-[11.5px] text-white/70 mt-3 leading-normal border-t border-white/5 pt-2.5">
                        {acc.desc}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">
                          {acc.workspace}
                        </span>
                        <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider", acc.badgeColor)}>
                          {acc.role}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
                <span>StartAPPss Tenant Environment</span>
                <span className="font-mono">v1.1.0</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
