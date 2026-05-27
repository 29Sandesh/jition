import React, { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Mention from "@tiptap/extension-mention";
import Link from "@tiptap/extension-link";
import { cn } from "../lib/utils";
import * as Y from "yjs";

interface CollaborativeEditorProps {
  docId: string;
  socket: any;
  placeholder?: string;
  readOnly?: boolean;
}

export function CollaborativeEditor({ docId, socket, placeholder = "Type '/' for commands, or write content...", readOnly = false }: CollaborativeEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), [docId]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });

  // Real-time WebSocket synchronization for CRDT document states
  useEffect(() => {
    if (!socket || !docId) return;

    socket.emit("join-document", docId);

    const handleInit = (stateVector: ArrayBuffer) => {
      Y.applyUpdate(ydoc, new Uint8Array(stateVector));
    };

    const handleUpdate = (update: ArrayBuffer) => {
      Y.applyUpdate(ydoc, new Uint8Array(update));
    };

    socket.on("document-init", handleInit);
    socket.on("document-update", handleUpdate);

    // Send local document changes to other connected clients
    ydoc.on("update", (update) => {
      socket.emit("document-update", update.buffer);
    });

    return () => {
      socket.off("document-init", handleInit);
      socket.off("document-update", handleUpdate);
    };
  }, [docId, socket, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // History handled by Yjs collaboration
      } as any),
      Collaboration.configure({
        document: ydoc,
        field: "content",
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer hover:text-primary-variant",
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "bg-primary-container text-on-primary-container px-1 py-0.5 rounded font-bold",
        },
        suggestion: {
          items: ({ query }) => {
            // Live user search list
            return [
              "Alice Johnson",
              "Bob Smith",
              "Charlie Davis",
              "Diana Miller",
              "Ethan Wilson",
            ].filter((name) => name.toLowerCase().startsWith(query.toLowerCase()));
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[300px] text-body-lg leading-relaxed text-on-surface-variant",
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          const { selection } = view.state;
          const coords = view.coordsAtPos(selection.from);
          setSlashCoords({ top: coords.bottom + window.scrollY, left: coords.left + window.scrollX });
          setShowSlashMenu(true);
        } else {
          setShowSlashMenu(false);
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  if (!editor) return null;

  const triggerCommand = (command: string) => {
    setShowSlashMenu(false);
    editor.chain().focus();
    if (command === "h1") editor.chain().toggleHeading({ level: 1 }).run();
    else if (command === "h2") editor.chain().toggleHeading({ level: 2 }).run();
    else if (command === "h3") editor.chain().toggleHeading({ level: 3 }).run();
    else if (command === "bulletList") editor.chain().toggleBulletList().run();
    else if (command === "orderedList") editor.chain().toggleOrderedList().run();
    else if (command === "blockquote") editor.chain().toggleBlockquote().run();
    else if (command === "codeBlock") editor.chain().toggleCodeBlock().run();
  };

  return (
    <div className="w-full relative bg-white border border-outline-variant rounded-2xl p-6 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
      {/* Editor Formatting Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant pb-4 mb-4 select-none">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("bold") && "bg-primary/10 text-primary")}
            title="Bold"
          >
            <span className="material-symbols-outlined text-[20px]">format_bold</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("italic") && "bg-primary/10 text-primary")}
            title="Italic"
          >
            <span className="material-symbols-outlined text-[20px]">format_italic</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("strike") && "bg-primary/10 text-primary")}
            title="Strike"
          >
            <span className="material-symbols-outlined text-[20px]">format_strikethrough</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("code") && "bg-primary/10 text-primary")}
            title="Code"
          >
            <span className="material-symbols-outlined text-[20px]">code</span>
          </button>

          <div className="w-px h-5 bg-outline-variant/60 mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("heading", { level: 1 }) && "bg-primary/10 text-primary")}
            title="Heading 1"
          >
            <span className="material-symbols-outlined text-[20px]">format_h1</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("heading", { level: 2 }) && "bg-primary/10 text-primary")}
            title="Heading 2"
          >
            <span className="material-symbols-outlined text-[20px]">format_h2</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("heading", { level: 3 }) && "bg-primary/10 text-primary")}
            title="Heading 3"
          >
            <span className="material-symbols-outlined text-[20px]">format_h3</span>
          </button>

          <div className="w-px h-5 bg-outline-variant/60 mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("bulletList") && "bg-primary/10 text-primary")}
            title="Bullet List"
          >
            <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("orderedList") && "bg-primary/10 text-primary")}
            title="Ordered List"
          >
            <span className="material-symbols-outlined text-[20px]">format_list_numbered</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn("p-1.5 rounded hover:bg-surface-container-high text-on-surface transition-colors", editor.isActive("blockquote") && "bg-primary/10 text-primary")}
            title="Blockquote"
          >
            <span className="material-symbols-outlined text-[20px]">format_quote</span>
          </button>
        </div>
      )}

      {/* Editor ProseMirror Content Area */}
      <EditorContent editor={editor} />

      {/* Inline Slash command menu popup */}
      {showSlashMenu && !readOnly && (
        <div
          className="absolute z-50 bg-white border border-outline-variant rounded-xl shadow-xl w-60 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: slashCoords.top - 20, left: slashCoords.left }}
        >
          <div className="p-2 text-label-sm font-bold text-outline uppercase tracking-wider bg-surface-container-lowest border-b border-outline-variant">
            Insert Blocks
          </div>
          <div className="p-1 max-h-[220px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => triggerCommand("h1")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_h1</span> Heading 1
            </button>
            <button
              onClick={() => triggerCommand("h2")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_h2</span> Heading 2
            </button>
            <button
              onClick={() => triggerCommand("h3")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_h3</span> Heading 3
            </button>
            <button
              onClick={() => triggerCommand("bulletList")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_list_bulleted</span> Bulleted List
            </button>
            <button
              onClick={() => triggerCommand("orderedList")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_list_numbered</span> Ordered List
            </button>
            <button
              onClick={() => triggerCommand("blockquote")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">format_quote</span> Block Quote
            </button>
            <button
              onClick={() => triggerCommand("codeBlock")}
              className="w-full text-left p-2 rounded-lg hover:bg-surface-container-low flex items-center gap-3"
            >
              <span className="material-symbols-outlined">code</span> Code Block
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
