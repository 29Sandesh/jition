import { useState } from "react";

export function HelpPage() {
  const [search, setSearch] = useState("");

  const faqs = [
    { q: "How do I invite team members?", a: "Go to the Share Workspace page from the sidebar or dashboard header. Enter their email address and assign a role (Viewer, Editor, Admin)." },
    { q: "Can I customize the dashboard?", a: "Yes. Click 'Edit Dashboard' in the top right of the dashboard view. You can toggle widgets on and off according to your preference." },
    { q: "Where are my deleted files?", a: "Deleted files are moved to the Trash. They stay there for 30 days before being permanently removed. You can restore them anytime within this period." },
    { q: "How does the Timeline work?", a: "The Timeline automatically tracks project milestones and tasks with specific deadlines. You can't edit it directly; it updates based on your task data." },
  ];

  return (
    <div className="p-gutter max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]">help_center</span>
        </div>
        <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-4">How can we help?</h2>
        <div className="relative max-w-[500px] mx-auto">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">search</span>
          <input 
            type="text" 
            placeholder="Search for articles, tutorials, or FAQs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-body-lg border border-outline-variant rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="bg-white border border-outline-variant rounded-2xl p-6 hover:border-primary transition-colors cursor-pointer group shadow-sm">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">menu_book</span>
          </div>
          <h3 className="text-title-lg font-bold text-on-surface mb-2">Getting Started Guide</h3>
          <p className="text-body-md text-on-surface-variant">Learn the basics of Kinetic Ledger and set up your first workspace.</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-2xl p-6 hover:border-primary transition-colors cursor-pointer group shadow-sm">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">play_circle</span>
          </div>
          <h3 className="text-title-lg font-bold text-on-surface mb-2">Video Tutorials</h3>
          <p className="text-body-md text-on-surface-variant">Watch step-by-step videos to master advanced features.</p>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
        <h3 className="text-title-xl font-bold text-on-surface mb-6">Frequently Asked Questions</h3>
        <div className="space-y-6">
          {faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())).map((faq, idx) => (
            <div key={idx} className="border-b border-outline-variant pb-6 last:border-0 last:pb-0">
              <h4 className="text-title-md font-bold text-on-surface mb-2 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">help</span>
                {faq.q}
              </h4>
              <p className="text-body-lg text-on-surface-variant pl-8">{faq.a}</p>
            </div>
          ))}
          {faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <p className="text-center text-on-surface-variant py-4">No results found for "{search}"</p>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-body-lg text-on-surface-variant">
          Still need help? <a href="#" className="text-primary font-bold hover:underline">Contact Support</a>
        </p>
      </div>
    </div>
  );
}
