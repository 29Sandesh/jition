import fs from "fs";

const path = "src/pages/HierarchyPage.tsx";
let content = fs.readFileSync(path, "utf-8");

const target =                                                  {hasPermission(ws._id, "Editor") && (
                                                   <button 
                                                     onClick={() => setShowAddModal({ type: "task", parentId: story._id })}
                                                     className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                                     title="Add Task"
                                                   >
                                                     <span className="material-symbols-outlined text-[16px]">add</span>
                                                     <span className="text-label-sm font-bold ml-0.5">Task</span>
                                                   </button>
                                                 )}
                                               </div>;

const replacement =                                                  {hasPermission(ws._id, "Editor") && (
                                                   <button 
                                                     onClick={() => setShowAddModal({ type: "task", parentId: story._id })}
                                                     className="p-1 rounded text-primary hover:bg-primary/5 flex items-center justify-center"
                                                     title="Add Task"
                                                   >
                                                     <span className="material-symbols-outlined text-[16px]">add</span>
                                                     <span className="text-label-sm font-bold ml-0.5">Task</span>
                                                   </button>
                                                 )}
                                                 {(user?.role === "Owner" || user?.role === "Admin") && (
                                                   <button 
                                                     onClick={(e) => { e.stopPropagation(); handleDeleteItem(story._id, "story", epic._id); }}
                                                     className="p-1 rounded text-error hover:bg-error/10 flex items-center justify-center transition-colors ml-1"
                                                     title="Delete Story"
                                                   >
                                                     <span className="material-symbols-outlined text-[16px]">delete</span>
                                                   </button>
                                                 )}
                                               </div>;

// Since quotes might be single/double, let's normalize or search via a regex
// To be safe, we can do a simple search and replace on the exact text.
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, "utf-8");
  console.log("Successfully replaced story delete button!");
} else {
  console.log("Target not found exactly, trying relaxed search");
  // Relaxed search replacing the exact button signature
  const regex = /\{\s*hasPermission\(\s*ws\._id,\s*['"]Editor['"]\s*\)\s*&&\s*\(\s*<button[^>]*onClick=\{\(\)\s*=>\s*setShowAddModal\(\{\s*type:\s*['"]task['"],\s*parentId:\s*story\._id\s*\}\)[^>]*>[\s\S]*?<\/button>\s*\)\s*\}/g;
  console.log("Regex match exists:", regex.test(content));
}
