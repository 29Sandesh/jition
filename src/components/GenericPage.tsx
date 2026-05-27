import { useNavigate } from "react-router-dom";

export function GenericPage({ title, description, icon }: { title: string, description: string, icon: string }) {
  const navigate = useNavigate();
  return (
    <div className="p-gutter max-w-[1200px] mx-auto w-full">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant border border-outline-variant">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight">{title}</h2>
      </div>
      <div className="bg-white border border-outline-variant rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-20 h-20 bg-surface-container-low text-primary flex items-center justify-center rounded-2xl mb-6 shadow-inner tracking-tight">
          <span className="material-symbols-outlined text-[40px]">{icon}</span>
        </div>
        <h3 className="text-headline-md font-headline-md text-on-surface mb-3 tracking-tight">{title} View</h3>
        <p className="text-body-lg text-on-surface-variant max-w-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
