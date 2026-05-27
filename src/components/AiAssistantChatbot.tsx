import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistantChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize welcoming message based on user role
  useEffect(() => {
    if (user && messages.length === 0) {
      const role = user.role || "Member";
      let roleDescription = "As a Member, you can create and edit tasks, stories, and epics here.";
      
      if (role === "Owner") {
        roleDescription = "As Owner, you have full control over workspaces, billing, and team memberships.";
      } else if (role === "Admin" || role === "Auditor") {
        roleDescription = "As Admin/Auditor, you can manage workspaces and audit compliance logs.";
      } else if (role === "Lead") {
        roleDescription = "As Lead, you can coordinate sprints, stories, and delegate tasks.";
      } else if (role === "Viewer") {
        roleDescription = "As Viewer, you have read-only access to boards, gantt charts, and dashboard analytics.";
      }

      setMessages([
        {
          role: "assistant",
          content: `Hi ${user.name || "there"}! I'm your CirCle AI Co-Pilot. 👋\n\n${roleDescription}\n\nAsk me anything about our 6-level hierarchy, or tell me to assign/create tasks directly. For example: "assign a task to member eng" and I'll get it sorted!`,
        },
      ]);
    }
  }, [user, messages.length]);

  // Scroll to bottom when messages list updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Clean raw `<create_task>` tags from the display bubble
  const cleanAssistantMessage = (text: string): string => {
    return text.replace(/<create_task>[\s\S]*?<\/create_task>/, "").trim();
  };

  // Parser and executor for the direct task creation block
  const parseAndExecuteTaskCreation = async (text: string) => {
    const match = text.match(/<create_task>([\s\S]*?)<\/create_task>/);
    if (!match) return;

    try {
      const jsonStr = match[1].trim();
      const taskData = JSON.parse(jsonStr);

      const { title, description, status, priority, assigneeEmail } = taskData;
      if (!title) return;

      // 1. Fetch workspaces to resolve active workspace & members
      const orgId = user?.organisationId || "";
      const authHeaders = {
        "x-workspace-id": "default-workspace-id",
        "x-organisation-id": orgId,
        "x-user-id": user?.id || "",
        "x-company-id": orgId,
      };

      // Load workspaces
      const wsRes = await fetch("/api/workspaces", { headers: authHeaders });
      if (!wsRes.ok) throw new Error("Failed to load workspaces");
      const workspaces = await wsRes.json();
      if (!workspaces || workspaces.length === 0) throw new Error("No workspaces found");

      const activeWs = workspaces[0];
      const wsId = activeWs._id;

      // Load members of this workspace to find the assignee's ID
      const wsHeaders = {
        ...authHeaders,
        "x-workspace-id": wsId,
      };

      const membersRes = await fetch(`/api/workspaces/${wsId}/members`, { headers: wsHeaders });
      if (!membersRes.ok) throw new Error("Failed to load members");
      const members = await membersRes.json();

      // Resolve assignee ID from assigneeEmail
      let assigneeId = "";
      if (assigneeEmail) {
        const matchedMember = members.find((m: any) => m.email?.toLowerCase() === assigneeEmail.toLowerCase());
        if (matchedMember) {
          assigneeId = matchedMember._id;
        }
      }

      // Load projects in this workspace to get projectId
      const projRes = await fetch(`/api/workspaces/${wsId}/projects`, { headers: wsHeaders });
      if (!projRes.ok) throw new Error("Failed to load projects");
      const projects = await projRes.json();
      if (!projects || projects.length === 0) throw new Error("No projects found");
      const projectId = projects[0]._id;

      // 2. Create the task via API
      const createRes = await fetch("/api/workItems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...wsHeaders,
        },
        body: JSON.stringify({
          title,
          description: description || "",
          status: status || "Todo",
          priority: priority || "P2",
          projectId,
          assigneeIds: assigneeId ? [assigneeId] : [],
        }),
      });

      if (createRes.ok) {
        // Add a beautiful confirmation message inside chat bubble
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Task Successfully Created & Assigned!\n\n- Title/Heading: ${title}\n- Description: ${description || "No description"}\n- Assignee: ${assigneeEmail || "Unassigned"}\n- Status: ${status || "Todo"}\n- Priority: ${priority || "P2"}\n\nI have placed this task directly onto your board!`,
          },
        ]);
      } else {
        const err = await createRes.json();
        throw new Error(err.message || "Failed to save the task on the server");
      }

    } catch (e: any) {
      console.error("AI Task Creation failed:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Failed to execute task command: ${e.message || e}`,
        },
      ]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      // Build simple messages context including history
      const history = messages
        .filter((m) => m.content && !m.content.startsWith("Hi "))
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const payloadMessages = [...history, { role: "user", content: userMessage }];

      // Fetch Server-Sent Events stream from server
      const response = await fetch("/api/chat/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to OpenRouter AI Co-Pilot");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setIsTyping(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          isDone = done;
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]") {
                  isDone = true;
                  break;
                }
                try {
                  const data = JSON.parse(dataStr);
                  if (data.content) {
                    assistantResponse += data.content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      if (updated.length > 0) {
                        updated[updated.length - 1] = {
                          role: "assistant",
                          content: assistantResponse,
                        };
                      }
                      return updated;
                    });
                  }
                } catch (e) {
                  // Ignore JSON chunk errors
                }
              }
            }
          }
        }
        // Stream completed! Let's check for task creation hooks
        await parseAndExecuteTaskCreation(assistantResponse);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had trouble reaching the OpenRouter API. Please try again.",
        },
      ]);
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[90vw] sm:w-[380px] h-[500px] rounded-2xl glass-panel border border-outline-variant/40 shadow-2xl flex flex-col mb-4 overflow-hidden relative backdrop-blur-xl bg-surface-container-low/90 dark:bg-surface-container-low/80"
          >
            {/* Header */}
            <div className="p-4 bg-primary/10 border-b border-outline-variant/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                {/* Logo: hollow circle */}
                <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0 shadow-md">
                  <div className="w-4 h-4 rounded-full border border-primary/40" />
                </div>
                <div>
                  <h4 className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                    The CirCle AI Co-Pilot
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      {user?.role || "Member"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-on-surface-variant font-medium">DeepSeek v4 Reasoning Engine</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-container-lowest/50">
              {messages.map((msg, index) => {
                const cleanedContent = cleanAssistantMessage(msg.content);
                if (!cleanedContent) return null; // Hide raw command blocks if empty

                return (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-body-sm shadow-xs border ${
                        msg.role === "user"
                          ? "bg-primary text-white border-primary/20 rounded-tr-none"
                          : "bg-surface-container-high text-on-surface border-outline-variant/30 rounded-tl-none"
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed font-medium prose prose-sm dark:prose-invert">
                        {cleanedContent}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-surface-container-high text-on-surface-variant rounded-2xl rounded-tl-none p-3 shadow-xs border border-outline-variant/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-outline-variant/30 bg-surface-container-lowest shrink-0 flex gap-2 items-center"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask your assistant..."
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-hover active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary via-primary-hover to-secondary text-white flex items-center justify-center shadow-xl hover:shadow-primary/20 active:shadow-md cursor-pointer transition-all border border-white/10 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        {/* Hollow Circle Logo on FAB */}
        <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shrink-0">
          <div className="w-2.5 h-2.5 rounded-full border border-white/40" />
        </div>
      </motion.button>
    </div>
  );
}
