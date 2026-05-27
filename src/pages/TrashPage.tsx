import { useState } from "react";
import { toast } from "sonner";

export function TrashPage() {
  const [items, setItems] = useState([
    { id: 1, name: "Old Dashboard Draft", type: "Document", deletedBy: "Alex Morgan", deletedAt: "2 days ago" },
    { id: 2, name: "Fix navigation bug", type: "Task", deletedBy: "Sarah Chen", deletedAt: "5 days ago" },
    { id: 3, name: "Q3 Marketing Assets", type: "Folder", deletedBy: "Alex Morgan", deletedAt: "1 week ago" },
    { id: 4, name: "Meeting Notes - Oct 12", type: "Document", deletedBy: "David Kim", deletedAt: "2 weeks ago" },
  ]);
  
  const [selected, setSelected] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  
  const toggleAll = () => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map(i => i.id));
  };

  const handleRestore = () => {
    if (selected.length === 0) return;
    setItems(items.filter(i => !selected.includes(i.id)));
    setSelected([]);
    toast.success(`${selected.length} items restored to workspace`);
  };

  const handleDelete = () => {
    if (selected.length === 0) return;
    setItems(items.filter(i => !selected.includes(i.id)));
    setSelected([]);
    toast.success(`${selected.length} items permanently deleted`);
  };

  return (
    <div className="p-gutter max-w-[1000px] mx-auto w-full pb-20">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Trash</h2>
          <p className="text-body-lg text-on-surface-variant">Items in trash will be permanently deleted after 30 days.</p>
        </div>
        {selected.length > 0 && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
            <button onClick={handleRestore} className="px-4 py-2 border border-outline-variant rounded-lg font-bold text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">restore</span>
              Restore
            </button>
            <button onClick={handleDelete} className="px-4 py-2 bg-error text-white rounded-lg font-bold hover:bg-error/90 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Delete Forever
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-label-md text-outline">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={selected.length === items.length && items.length > 0} 
                  onChange={toggleAll}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                />
              </th>
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Type</th>
              <th className="p-4 font-bold">Deleted By</th>
              <th className="p-4 font-bold">Date Deleted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {items.map((item) => (
              <tr 
                key={item.id} 
                className={`hover:bg-surface-container-lowest transition-colors cursor-pointer ${selected.includes(item.id) ? 'bg-primary/5' : ''}`}
                onClick={() => toggleSelect(item.id)}
              >
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selected.includes(item.id)} 
                    onChange={() => {}} // handled by row click
                    className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline">
                      {item.type === 'Document' ? 'description' : item.type === 'Task' ? 'check_circle' : 'folder'}
                    </span>
                    <span className="font-medium text-on-surface">{item.name}</span>
                  </div>
                </td>
                <td className="p-4 text-body-md text-on-surface-variant">{item.type}</td>
                <td className="p-4 text-body-md text-on-surface-variant">{item.deletedBy}</td>
                <td className="p-4 text-body-md text-on-surface-variant">{item.deletedAt}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">delete_outline</span>
                  <p className="text-body-lg">Trash is empty</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
