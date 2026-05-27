import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

interface FaqItem {
  q: string;
  a: string;
}

export function HelpPage() {
  const [search, setSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  const faqs: FaqItem[] = [
    { 
      q: "How do I invite team members?", 
      a: "Click 'Share Workspace' in the top right of the header or go to the settings page. You will get a unique share URL. Send this link to your team members, and they will automatically join your organization and workspaces upon registration." 
    },
    { 
      q: "Can I customize the dashboard?", 
      a: "Yes. Click the 'Edit Dashboard' action in your workspace header. You can easily toggle different summary widgets, task charts, and activity streams on or off based on your workflow preferences." 
    },
    { 
      q: "Where are my deleted files and tasks?", 
      a: "Deleted items are safely moved to the Trash. They are preserved there for 30 days before being permanently pruned. You can restore any item instantly at any point during this period." 
    },
    { 
      q: "How does the Sprint Timeline work?", 
      a: "The Timeline tracks milestones and tasks based on scheduled dates. You can reschedule task bars by dragging them inside the Sprint Planner, and the timeline will automatically update to reflect your data." 
    },
  ];

  const handleStartGuide = () => {
    localStorage.setItem("jition-tutorial-step", "1");
    // Dispatch custom trigger event
    window.dispatchEvent(new Event("jition-tutorial-started"));
    toast.success("Launching your Interactive Getting Started Tour!");
    navigate("/");
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-gutter max-w-[900px] mx-auto w-full pb-28">
      
      {/* 🌟 Header Section */}
      <div className="mb-14 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-18 h-18 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mx-auto mb-6 border border-primary/20 shadow-inner"
        >
          <span className="material-symbols-outlined text-[36px]">help_center</span>
        </motion.div>
        <h2 className="text-headline-xl font-headline-xl font-bold text-on-surface tracking-tight mb-4">
          How can we help you?
        </h2>
        <p className="text-body-lg text-on-surface-variant max-w-[500px] mx-auto mb-8 font-medium">
          Browse our frequently asked questions or launch our interactive step-by-step tour.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-[540px] mx-auto group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input 
            type="text" 
            placeholder="Search for articles, help guides, or FAQs..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenFaqIndex(null); // Reset accordions on search
            }}
            className="w-full pl-12 pr-4 py-4 text-body-lg bg-white border border-outline-variant rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm hover:shadow transition-all font-medium text-on-surface"
          />
        </div>
      </div>

      {/* 🚀 Feature Cards (Getting Started Guide Only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Getting Started Guide */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={handleStartGuide}
          className="bg-white border border-outline-variant/80 hover:border-primary rounded-3xl p-6 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <h3 className="text-title-lg font-bold text-on-surface mb-2">Getting Started Guide</h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Launch our premium 5-step interactive walkthrough. Navigate through the Dashboard, Kanban Tasks, Sprint Planner, Hierarchy Tree, and wiki document systems dynamically.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 font-bold text-label-md text-primary group-hover:translate-x-1 transition-transform">
            Start Tour Now <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </motion.div>

        {/* Contact Support Block */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-gradient-to-br from-[#0f0c29]/5 via-[#201a47]/5 to-[#302b63]/5 border border-outline-variant/80 hover:border-primary rounded-3xl p-6 transition-all shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-secondary/15 text-secondary rounded-xl flex items-center justify-center mb-5 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">contact_support</span>
            </div>
            <h3 className="text-title-lg font-bold text-on-surface mb-2">Still Need Assistance?</h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Can't find what you are looking for in our FAQs? Feel free to contact our customer engineering team. We are available 24/7 to solve your workflow blocks.
            </p>
          </div>
          <div className="mt-6">
            <a 
              href="mailto:support@startappss.io" 
              className="inline-flex items-center gap-1.5 font-bold text-label-md text-primary hover:underline"
            >
              Contact Support Desk <span className="material-symbols-outlined text-[16px]">mail</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* ❓ Collapsible FAQs Accordion Section */}
      <div className="bg-white border border-outline-variant/80 rounded-3xl p-8 shadow-sm">
        <h3 className="text-title-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[28px]">quiz</span>
          Frequently Asked Questions
        </h3>

        <div className="divide-y divide-outline-variant/40">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="py-4.5 first:pt-0 last:pb-0">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left flex justify-between items-center gap-4 hover:text-primary transition-colors py-1.5 select-none"
                >
                  <h4 className="text-title-md font-bold text-on-surface flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary/70 text-[20px] mt-0.5 shrink-0">help</span>
                    {faq.q}
                  </h4>
                  <span className="material-symbols-outlined text-outline-variant transition-transform duration-300">
                    {isOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-body-lg text-on-surface-variant pl-8 pt-2 pb-2 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] opacity-40 mb-3">search_off</span>
              <p className="text-body-lg font-bold">No results found</p>
              <p className="text-label-sm text-outline mt-1">We couldn't find any FAQs matching "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
