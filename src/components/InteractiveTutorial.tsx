import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface StepConfig {
  step: number;
  route: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
}

const STEPS: StepConfig[] = [
  {
    step: 1,
    route: "/",
    title: "🌟 Welcome to The CirCle Dashboard",
    desc: "This is your personal command center! Here, you can review sprint velocity charts, track workspace statistics, and see your recent activity timeline at a glance.",
    icon: "dashboard",
    color: "from-blue-500 to-indigo-600"
  },
  {
    step: 2,
    route: "/tasks",
    title: "📋 Organize with Kanban Tasks",
    desc: "Manage tasks easily with columns (Todo, In Progress, Review, Done). You can drag and drop cards to change status, click them to edit details, or create new cards instantly.",
    icon: "task_alt",
    color: "from-indigo-500 to-purple-600"
  },
  {
    step: 3,
    route: "/planner",
    title: "📅 Sprint Timeline Planner",
    desc: "Map your project timelines visually! Drag task bars to reschedule, assign developers, and balance resource loads to make sure you never miss a deadline.",
    icon: "calendar_month",
    color: "from-purple-500 to-pink-600"
  },
  {
    step: 4,
    route: "/hierarchy",
    title: "🌳 Structure with Hierarchy Tree",
    desc: "Trace anything! This view maps your organization from workspaces and projects down through epics and stories to trace each individual subtask's source.",
    icon: "account_tree",
    color: "from-pink-500 to-rose-600"
  },
  {
    step: 5,
    route: "/docs",
    title: "📝 Collaborative Wiki Docs",
    desc: "Create and collaborate on pages! Write with headers, checklists, and callout blocks. Page updates are saved to the server dynamically for seamless wiki creation.",
    icon: "menu_book",
    color: "from-rose-500 to-orange-500"
  }
];

export function InteractiveTutorial() {
  const [step, setStep] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Check if we have an active tutorial session running
    const activeStep = localStorage.getItem("jition-tutorial-step");
    const hasSeen = localStorage.getItem("jition-has-seen-tutorial");

    if (activeStep) {
      setStep(parseInt(activeStep, 10));
    } else if (!hasSeen) {
      // First-time signup onboarding: Auto-trigger tutorial
      setStep(1);
      localStorage.setItem("jition-tutorial-step", "1");
    }

    // 2. Custom listener for manual triggers (e.g. from the Help Page)
    const handleStartEvent = () => {
      setStep(1);
      localStorage.setItem("jition-tutorial-step", "1");
      navigate("/");
    };

    window.addEventListener("jition-tutorial-started", handleStartEvent);
    return () => {
      window.removeEventListener("jition-tutorial-started", handleStartEvent);
    };
  }, [navigate]);

  // Keep route in sync with the current step's route
  useEffect(() => {
    if (step === null) return;

    const currentStepConfig = STEPS.find((s) => s.step === step);
    if (currentStepConfig && location.pathname !== currentStepConfig.route) {
      // Force navigation to the step's page
      navigate(currentStepConfig.route);
    }
  }, [step, location.pathname, navigate]);

  if (step === null) return null;

  const currentStep = STEPS.find((s) => s.step === step);
  if (!currentStep) return null;

  const handleNext = () => {
    if (step < STEPS.length) {
      const nextStep = step + 1;
      setStep(nextStep);
      localStorage.setItem("jition-tutorial-step", nextStep.toString());
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      localStorage.setItem("jition-tutorial-step", prevStep.toString());
    }
  };

  const handleFinish = () => {
    setStep(null);
    localStorage.removeItem("jition-tutorial-step");
    localStorage.setItem("jition-has-seen-tutorial", "true");
  };

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-50 max-w-[400px] w-[calc(100vw-48px)]">
        
        {/* Glowing Ambient Radial Ring behind popup */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-3xl blur-xl -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="glass-panel border border-outline-variant/60 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col text-on-surface"
        >
          {/* Header Row */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className={cn(
              "w-11 h-11 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-white shadow-inner shrink-0",
              currentStep.color
            )}>
              <span className="material-symbols-outlined text-[22px]">{currentStep.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-outline">
                Workspace Tour • Step {step} of {STEPS.length}
              </span>
              <h3 className="font-bold text-title-md leading-tight text-on-surface truncate">
                {currentStep.title}
              </h3>
            </div>
            <button
              onClick={handleFinish}
              className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-outline-variant hover:text-on-surface-variant transition-colors"
              title="Skip Tour"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Description */}
          <p className="text-body-md text-on-surface-variant leading-relaxed mb-6 font-medium">
            {currentStep.desc}
          </p>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4 mt-auto">
            {/* Progress Dots */}
            <div className="flex gap-1.5">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    s.step === step 
                      ? "w-5 bg-primary" 
                      : s.step < step 
                        ? "w-2 bg-primary/40" 
                        : "w-1.5 bg-outline-variant"
                  )}
                />
              ))}
            </div>

            {/* Nav Buttons */}
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 border border-outline-variant rounded-xl text-label-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className={cn(
                  "px-4.5 py-2 rounded-xl text-white font-bold text-label-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5 bg-gradient-to-r hover:shadow-lg",
                  currentStep.color
                )}
              >
                {step === STEPS.length ? "Finish Tour 🚀" : "Next Page ➔"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
