import React, { useState, useRef, useEffect } from "react";
import { useDocs, Document, BlockType, Block } from "../lib/DocsContext";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from "motion/react";





function SortableBlock({ block, isEditing, onChange, onKeyDown, onToggleCheck, onBlockMenu }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const contentRef = useRef<HTMLDivElement>(null);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content && document.activeElement !== contentRef.current) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.content]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    const html = e.currentTarget.innerHTML;
    
    if (text === '[] ' && block.type !== 'todo') { onChange(block.id, 'todo', ''); contentRef.current!.innerHTML = ''; return; }
    if (text === '> ' && block.type !== 'quote') { onChange(block.id, 'quote', ''); contentRef.current!.innerHTML = ''; return; }
    if (text === '---' && block.type !== 'divider') { onChange(block.id, 'divider', ''); contentRef.current!.innerHTML = ''; return; }
    
    onChange(block.id, block.type, html);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown('Enter', block.id);
    }
    if (e.key === 'Backspace' && !e.currentTarget.textContent && block.type === 'p') {
      e.preventDefault();
      onKeyDown('Backspace', block.id);
    }
    if (e.key === 'Backspace' && !e.currentTarget.textContent && block.type !== 'p') {
      e.preventDefault();
      onChange(block.id, 'p', ''); 
    }
    
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    }
  };

  const getBlockStyle = (type: BlockType) => {
    switch(type) {
      case 'h1': return 'text-[40px] font-bold font-headline-xl text-on-surface mb-6 mt-8 placeholder-style';
      case 'h2': return 'text-[32px] font-bold font-headline-lg text-on-surface mb-4 mt-6 placeholder-style';
      case 'h3': return 'text-[24px] font-bold font-headline-md text-on-surface mb-3 mt-4 placeholder-style';
      case 'info': return 'p-4 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-lg border-l-4 border-tertiary my-4 placeholder-style';
      case 'ul': return 'my-2 list-disc placeholder-style';
      case 'quote': return 'border-l-4 border-outline text-on-surface-variant italic pl-4 py-1 my-4 text-body-lg placeholder-style';
      case 'todo': return 'my-2 flex-1 placeholder-style';
      case 'divider': return 'w-full h-px bg-outline-variant my-8';
      default: return 'text-body-lg text-on-surface-variant leading-[1.8] my-2 placeholder-style';
    }
  };

  if (block.type === 'divider') {
     return (
        <div ref={setNodeRef} style={style} className="group relative flex items-center -ml-12 pl-12 pr-4 py-2 rounded hover:bg-surface-container-lowest transition-colors">
          {isEditing && (
            <div {...attributes} {...listeners} className="absolute left-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-outline-variant p-1 hover:bg-surface-container-low rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
            </div>
          )}
          <div className="w-full h-px bg-outline-variant/50"></div>
        </div>
     );
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative flex items-start -ml-12 pl-12 pr-4 py-1 rounded hover:bg-surface-container-lowest transition-colors">
      {isEditing && (
        <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
          <div 
            onClick={(e) => { e.stopPropagation(); onBlockMenu(e, block.id); }} 
            className="cursor-pointer text-outline hover:text-on-surface p-1 hover:bg-surface-container-low rounded flex items-center justify-center h-8"
          >
            <span className="material-symbols-outlined text-[16px]">more_vert</span>
          </div>
          <div {...attributes} {...listeners} className="cursor-grab text-outline hover:text-on-surface p-1 hover:bg-surface-container-low rounded flex items-center justify-center h-8">
            <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
          </div>
        </div>
      )}
      
      {block.type === 'info' && <span className="material-symbols-outlined mt-1 absolute left-16 text-tertiary">info</span>}
      {block.type === 'ul' && <span className="absolute left-16 top-3 w-1.5 h-1.5 rounded-full bg-on-surface"></span>}
      {block.type === 'todo' && (
         <div className="absolute left-16 top-2.5 cursor-pointer" onClick={() => onToggleCheck(block.id)}>
            <span className={cn("material-symbols-outlined text-[20px]", block.checked ? "text-primary" : "text-outline-variant hover:text-outline")}>
               {block.checked ? "check_box" : "check_box_outline_blank"}
            </span>
         </div>
      )}
      
      <div className="w-full flex">
        <div 
          id={`block-${block.id}`}
          ref={contentRef}
          contentEditable={isEditing}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
          data-placeholder={block.type === 'h1' ? "Heading 1" : block.type === 'todo' ? "To-do" : block.type === 'ul' ? "List" : block.type === 'quote' ? "Empty quote" : "Type '/' for commands or '[]' for a todo"}
          className={cn(
            "w-full bg-transparent focus:outline-none rounded px-2 -ml-2 transition-all min-h-[24px]", 
            getBlockStyle(block.type), 
            (block.type === 'info') && "ml-8",
            (block.type === 'ul' || block.type === 'todo') && "ml-8",
            block.checked && block.type === 'todo' && "line-through text-outline"
          )}
        />
      </div>
    </div>
  );
}

export function Docs() {
  const { documents, setDocuments, activeDocId, setActiveDocId, createDocument, updateDocument } = useDocs();
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.newPage) {
      const { title, template, emoji } = location.state.newPage;
      const newId = createDocument(title, template, emoji);
      setActiveDocId(newId);
      
      // Clear state so it doesn't re-trigger on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);
  
  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];
  
  const updateActiveDoc = (updates: Partial<Document>) => {
    if (activeDoc) {
      updateDocument(activeDocId, updates);
    }
  };
  
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{show: boolean, blockId: string | null, top: number, left: number}>({show: false, blockId: null, top: 0, left: 0});
  const [toolbar, setToolbar] = useState<{show: boolean, top: number, left: number}>({ show: false, top: 0, left: 0 });
  const [blockMenu, setBlockMenu] = useState<{show: boolean, blockId: string | null, top: number, left: number}>({show: false, blockId: null, top: 0, left: 0});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0 && isEditing) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbar({ show: true, top: rect.top - 45 + window.scrollY, left: rect.left + window.scrollX + (rect.width/2) - 60 });
      } else {
        setToolbar({ ...toolbar, show: false });
      }
    };
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    return () => { document.removeEventListener('mouseup', handleSelection); document.removeEventListener('keyup', handleSelection); };
  }, [isEditing, toolbar]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeDoc.blocks.findIndex((i) => i.id === active.id);
      const newIndex = activeDoc.blocks.findIndex((i) => i.id === over.id);
      updateActiveDoc({ blocks: arrayMove(activeDoc.blocks, oldIndex, newIndex) });
    }
  };

  const updateBlock = (id: string, type: BlockType, content: string) => {
    const newBlocks = activeDoc.blocks.map(b => b.id === id ? { ...b, type, content } : b);
    updateActiveDoc({ blocks: newBlocks });
    
    if (content.endsWith('/')) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl) {
        const rect = activeEl.getBoundingClientRect();
        setSlashMenu({ show: true, blockId: id, top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
      }
    } else {
      setSlashMenu({ ...slashMenu, show: false });
    }
  };

  const toggleCheck = (id: string) => {
     updateActiveDoc({ blocks: activeDoc.blocks.map(b => b.id === id ? { ...b, checked: !b.checked } : b) });
  };

  const handleKeyDown = (action: string, id: string) => {
    const index = activeDoc.blocks.findIndex(b => b.id === id);
    
    if (action === 'Enter') {
      if (slashMenu.show) return;
      const newId = Date.now().toString();
      const currentBlock = activeDoc.blocks[index];
      const newType = currentBlock.type === 'ul' ? 'ul' : currentBlock.type === 'todo' ? 'todo' : 'p';
      
      const newBlock: Block = { id: newId, type: newType, content: '' };
      const newBlocks = [...activeDoc.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      updateActiveDoc({ blocks: newBlocks });
      
      setTimeout(() => document.getElementById(`block-${newId}`)?.focus(), 10);
    }
    
    if (action === 'Backspace') {
      if (activeDoc.blocks.length > 1 && index > 0) {
        const prevBlock = activeDoc.blocks[index - 1];
        updateActiveDoc({ blocks: activeDoc.blocks.filter(b => b.id !== id) });
        setTimeout(() => {
           const el = document.getElementById(`block-${prevBlock.id}`);
           if (el) { el.focus(); window.getSelection()?.collapse(el, el.childNodes.length); }
        }, 10);
      }
    }
  };

  const applySlashCommand = (type: BlockType) => {
    if (slashMenu.blockId) {
      updateActiveDoc({ blocks: activeDoc.blocks.map(b => b.id === slashMenu.blockId ? { ...b, type, content: b.content.slice(0, -1) } : b) });
      toast(`Changed to ${type}`);
    }
    setSlashMenu({ show: false, blockId: null, top: 0, left: 0 });
  };
  
  const handleFormat = (command: string) => {
     document.execCommand(command);
  };

  const createNewDocument = () => {
     const newDoc: Document = {
        id: `doc-${Date.now()}`,
        title: "Untitled",
        emoji: "📝",
        coverUrl: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2629&auto=format&fit=crop",
        coverPos: 50,
        blocks: [{ id: "1", type: "p", content: "" }]
     };
     setDocuments([...documents, newDoc]);
     setActiveDocId(newDoc.id);
  };

  return (
    <div className="flex w-full h-full bg-white relative">
      <style>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
          display: block;
        }
      `}</style>

      {/* Editor Area */}
      <div 
        className="flex-1 overflow-y-auto relative custom-scrollbar pb-32"
        onClick={() => { 
          slashMenu.show && setSlashMenu({...slashMenu, show: false});
          blockMenu.show && setBlockMenu({...blockMenu, show: false});
          isDocMenuOpen && setIsDocMenuOpen(false);
        }}
      >
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full relative">
          <nav className="flex items-center gap-2 text-on-surface-variant mb-8 font-label-sm text-label-sm uppercase tracking-widest sticky top-0 bg-white/80 backdrop-blur-md z-30 py-2 -mt-2">
            
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-1.5 text-on-surface font-bold">
                <span className="truncate max-w-[200px]">{activeDoc.title || "Untitled"}</span>
              </div>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
               <button 
                 onClick={() => {
                   if (documents.length <= 1) {
                     toast.error("Cannot delete the last document.");
                     return;
                   }
                   if (window.confirm("Are you sure you want to delete this document?")) {
                     const newDocs = documents.filter(d => d.id !== activeDocId);
                     setDocuments(newDocs);
                     setActiveDocId(newDocs[0].id);
                     toast.success("Document deleted");
                   }
                 }} 
                 className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-label-md text-error hover:bg-error/10 transition-colors"
               >
                 <span className="material-symbols-outlined text-[18px]">delete</span>
                 Delete
               </button>
               <button onClick={() => { setIsEditing(!isEditing); toast(isEditing ? "Viewing mode" : "Editing mode"); }} className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-label-md transition-colors", isEditing ? "bg-primary text-white shadow-sm" : "border border-outline-variant hover:bg-surface-container-low text-on-surface")}>
                  <span className="material-symbols-outlined text-[18px]">{isEditing ? 'visibility' : 'edit'}</span>
                  {isEditing ? 'Preview' : 'Edit Page'}
               </button>
            </div>
          </nav>

          <div className="relative group mb-16 animate-in fade-in duration-500">
            <div 
              className={cn("h-64 w-full rounded-xl overflow-hidden border border-outline-variant shadow-sm transition-shadow relative", isRepositioning ? "cursor-ns-resize shadow-md ring-2 ring-primary" : "group-hover:shadow-md")}
              onMouseMove={(e) => isRepositioning && updateActiveDoc({ coverPos: Math.min(Math.max(activeDoc.coverPos - e.movementY * 0.2, 0), 100) })}
              onMouseUp={() => isRepositioning && toast.success("Cover position saved")}
            >
              <img 
                  className="w-full h-[150%] object-cover pointer-events-none transition-none" 
                  style={{ objectPosition: `50% ${activeDoc.coverPos}%` }}
                  src={activeDoc.coverUrl} 
                  alt="Cover" 
                />
                
                {isEditing && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setIsRepositioning(!isRepositioning)} 
                      className={cn("px-3 py-1.5 rounded-lg text-label-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-sm transition-colors", isRepositioning ? "bg-primary text-white" : "bg-white/80 text-gray-800 hover:bg-white")}
                    >
                      <span className="material-symbols-outlined text-[16px]">crop</span>
                      {isRepositioning ? 'Done Repositioning' : 'Reposition'}
                    </button>
                  </div>
                )}
                
                {isRepositioning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 text-white px-4 py-2 rounded-full font-bold backdrop-blur-sm">Drag to reposition</div>
                  </div>
                )}
            </div>
            
            {/* Page Icon */}
            <div className="absolute -bottom-10 left-12">
              <div 
                className="text-[64px] cursor-pointer bg-white rounded-full p-2 w-[100px] h-[100px] flex items-center justify-center shadow-sm border border-outline-variant/30 hover:bg-surface-container-lowest transition-colors relative z-10"
                onClick={() => isEditing && setShowEmojiPicker(!showEmojiPicker)}
              >
                {activeDoc.emoji}
              </div>
              {showEmojiPicker && (
                <div className="absolute top-[110px] left-0 z-50 shadow-xl rounded-xl overflow-hidden border border-outline-variant">
                    <EmojiPicker onEmojiClick={(e) => { updateActiveDoc({ emoji: e.emoji }); setShowEmojiPicker(false); }} />
                </div>
              )}
            </div>
          </div>

          <div className="pl-12">
            {isEditing ? (
              <input 
                type="text" 
                value={activeDoc.title}
                onChange={e => updateActiveDoc({ title: e.target.value })}
                className="w-full text-[48px] font-headline-xl font-bold text-on-surface mb-2 tracking-tight bg-transparent focus:outline-none placeholder:text-outline-variant"
                placeholder="Untitled"
              />
            ) : (
              <h1 className="font-headline-xl text-[48px] font-bold text-on-surface mb-2 tracking-tight">{activeDoc.title || "Untitled"}</h1>
            )}
          </div>

          <div className="editor-content max-w-[800px] mx-auto mt-8">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeDoc.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {activeDoc.blocks.map((block) => (
                  <SortableBlock 
                    key={block.id} 
                    block={block} 
                    isEditing={isEditing} 
                    onChange={updateBlock}
                    onKeyDown={handleKeyDown}
                    onToggleCheck={toggleCheck}
                    onBlockMenu={(e: any, id: string) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setBlockMenu({ show: true, blockId: id, top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {isEditing && (
              <div 
                onClick={() => {
                  const newBlocks: Block[] = [...activeDoc.blocks, { id: Date.now().toString(), type: 'p' as BlockType, content: '' }];
                  updateActiveDoc({ blocks: newBlocks });
                  setTimeout(() => document.getElementById(`block-${newBlocks[newBlocks.length-1].id}`)?.focus(), 10);
                }}
                className="mt-4 p-4 text-outline-variant hover:bg-surface-container-lowest rounded-lg cursor-pointer flex items-center gap-2 transition-colors border-2 border-dashed border-transparent hover:border-outline-variant/30 ml-[40px]"
              >
                <span className="material-symbols-outlined">add</span>
                <span className="font-label-md">Click to add a block</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbars & Menus */}
      {toolbar.show && (
         <div 
           className="absolute z-50 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg flex items-center p-1 animate-in fade-in slide-in-from-bottom-2 duration-100"
           style={{ top: toolbar.top, left: toolbar.left }}
           onMouseDown={e => e.preventDefault()}
         >
           <button onClick={() => handleFormat('bold')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
           <button onClick={() => handleFormat('italic')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
           <button onClick={() => handleFormat('strikeThrough')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface"><span className="material-symbols-outlined text-[18px]">format_strikethrough</span></button>
           <div className="w-px h-5 bg-outline-variant/50 mx-1"></div>
           <button onClick={() => handleFormat('insertUnorderedList')} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
         </div>
      )}

      {blockMenu.show && (
         <div 
           className="absolute z-50 bg-white border border-outline-variant rounded-xl shadow-xl w-48 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
           style={{ top: blockMenu.top, left: blockMenu.left }}
         >
           <button onClick={() => {
              const b = activeDoc.blocks.find(x => x.id === blockMenu.blockId);
              if (b) {
                 const idx = activeDoc.blocks.indexOf(b);
                 const nb = [...activeDoc.blocks];
                 nb.splice(idx+1, 0, {...b, id: Date.now().toString()});
                 updateActiveDoc({ blocks: nb });
              }
              setBlockMenu({ ...blockMenu, show: false });
           }} className="w-full text-left p-2 hover:bg-surface-container-low flex items-center gap-3 transition-colors text-label-md text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">content_copy</span> Duplicate
           </button>
           <button onClick={() => {
              updateActiveDoc({ blocks: activeDoc.blocks.filter(b => b.id !== blockMenu.blockId) });
              setBlockMenu({ ...blockMenu, show: false });
           }} className="w-full text-left p-2 hover:bg-error/10 flex items-center gap-3 transition-colors text-label-md text-error">
              <span className="material-symbols-outlined text-[18px]">delete</span> Delete
           </button>
         </div>
      )}

      {slashMenu.show && (
        <div 
          className="absolute z-50 bg-white border border-outline-variant rounded-xl shadow-xl w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: slashMenu.top + 10, left: slashMenu.left }}
        >
          <div className="p-2 text-label-sm font-bold text-outline-variant uppercase tracking-wider bg-surface-container-lowest border-b border-outline-variant">
            Basic Blocks
          </div>
          <div className="p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
            {[
              { type: 'p', label: 'Text', icon: 'text_fields', desc: 'Just start writing' },
              { type: 'h1', label: 'Heading 1', icon: 'title', desc: 'Big section heading' },
              { type: 'h2', label: 'Heading 2', icon: 'title', desc: 'Medium section heading' },
              { type: 'h3', label: 'Heading 3', icon: 'title', desc: 'Small section heading' },
              { type: 'ul', label: 'Bulleted List', icon: 'format_list_bulleted', desc: 'Create a simple list' },
              { type: 'todo', label: 'To-do List', icon: 'check_box', desc: 'Track tasks with a list' },
              { type: 'quote', label: 'Quote', icon: 'format_quote', desc: 'Capture a quote' },
              { type: 'divider', label: 'Divider', icon: 'horizontal_rule', desc: 'Visually divide blocks' },
              { type: 'info', label: 'Callout', icon: 'info', desc: 'Make text stand out' },
            ].map(cmd => (
              <button 
                key={cmd.type}
                onClick={() => applySlashCommand(cmd.type as BlockType)}
                className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded border border-outline-variant bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{cmd.icon}</span>
                </div>
                <div>
                  <h5 className="text-label-md font-bold text-on-surface">{cmd.label}</h5>
                  <p className="text-[11px] text-on-surface-variant">{cmd.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
