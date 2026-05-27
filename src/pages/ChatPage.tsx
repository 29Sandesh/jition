import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/utils";

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface Conversation {
  id: string;
  otherUser: User;
  lastMessage: { content: string, timestamp: string } | null;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export function ChatPage() {
  const { user, organisation: company } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const authHeaders = {
    "x-user-id": user?.id || "",
    "x-company-id": company?.id || user?.companyId || ""
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/organisations/members", { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.filter((m: any) => m.id !== user?.id)); // exclude self
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchMembers();
  }, []);

  // Poll for new messages if active conversation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeConvId) {
      const fetchMsgs = async () => {
        try {
          const res = await fetch(`/api/chat/conversations/${activeConvId}/messages`, { headers: authHeaders });
          if (res.ok) {
            const data = await res.json();
            setMessages(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchMsgs(); // initial fetch
      interval = setInterval(fetchMsgs, 3000); // poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [activeConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartChat = async (targetUser: User) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConvId(data.id);
        setActiveUser(targetUser);
        fetchConversations();
        setSearchQuery("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;

    const content = messageInput.trim();
    setMessageInput(""); // Optimistic clear

    try {
      const res = await fetch(`/api/chat/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        // Fetch happens via polling, but we could optimistic append here
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: user?.id || "",
          senderName: user?.name || "",
          content,
          timestamp: data.timestamp
        }]);
        fetchConversations(); // Update last message in sidebar
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex absolute inset-0 bg-surface-container-lowest overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[320px] lg:w-[380px] border-r border-outline-variant flex flex-col bg-surface-container-lowest shrink-0 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-outline-variant">
          <h2 className="text-headline-md font-bold text-on-surface mb-6 tracking-tight">Messages</h2>
          
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search people to chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container py-3 pl-12 pr-4 rounded-xl text-body-md text-on-surface placeholder:text-on-surface-variant border-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {searchQuery ? (
            // Search Results (Members)
            <>
              <p className="px-3 py-2 text-label-sm font-bold text-outline uppercase tracking-wider">Search Results</p>
              {filteredMembers.length > 0 ? filteredMembers.map(m => (
                <div 
                  key={m.id} 
                  onClick={() => handleStartChat(m)}
                  className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-surface-container-high transition-all border border-transparent hover:shadow-sm"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 text-title-md overflow-hidden">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      m.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-label-lg text-on-surface truncate">{m.name}</p>
                    <p className="text-label-sm text-on-surface-variant font-medium truncate">{m.role}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="material-symbols-outlined text-[16px]">chat</span>
                  </div>
                </div>
              )) : <p className="p-4 text-body-md text-outline text-center">No people found.</p>}
            </>
          ) : (
            // Active Conversations
            <>
              <p className="px-3 py-2 text-label-sm font-bold text-outline uppercase tracking-wider">Recent Chats</p>
              {conversations.length > 0 ? conversations.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => { setActiveConvId(c.id); setActiveUser(c.otherUser); }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border",
                    activeConvId === c.id ? "bg-primary/5 border-primary/20 shadow-sm" : "hover:bg-surface-container-high border-transparent"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-title-md shrink-0 transition-colors overflow-hidden", activeConvId === c.id ? "bg-primary text-white shadow-sm" : "bg-surface-container-high text-on-surface")}>
                    {c.otherUser.avatar ? (
                      <img src={c.otherUser.avatar} alt={c.otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      c.otherUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-bold text-label-lg text-on-surface truncate">{c.otherUser.name}</p>
                      {c.lastMessage && (
                        <span className="text-[11px] font-bold text-outline shrink-0 ml-2">
                          {new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-body-md text-on-surface-variant truncate">
                      {c.lastMessage ? c.lastMessage.content : "Start chatting"}
                    </p>
                  </div>
                </div>
              )) : <p className="p-6 text-body-md text-outline text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl mx-2 mt-4">No active chats. Search for someone to start.</p>}
            </>
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest relative z-0">
        {activeConvId && activeUser ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-outline-variant flex items-center px-8 bg-white shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-title-md mr-4 shadow-inner overflow-hidden">
                {activeUser.avatar ? (
                  <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                ) : (
                  activeUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-title-lg text-on-surface leading-tight mb-0.5">{activeUser.name}</h3>
                <p className="text-label-md text-primary font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]"></span>
                  {activeUser.role}
                </p>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 bg-[#f8fafc]">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-outline">
                  <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[40px] text-primary/40">forum</span>
                  </div>
                  <p className="text-label-lg bg-white px-6 py-3 rounded-full shadow-sm border border-outline-variant/30 text-on-surface-variant">This is the start of your conversation with <span className="font-bold text-on-surface">{activeUser.name}</span>.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === user?.id;
                  const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={cn("flex flex-col max-w-[75%]", isMe ? "self-end items-end" : "self-start items-start")}>
                      {showHeader && (
                        <span className="text-[12px] font-bold text-outline mb-1.5 mx-2">
                          {isMe ? "You" : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <div className={cn(
                        "px-5 py-3 rounded-2xl text-body-lg shadow-sm leading-relaxed",
                        isMe ? "bg-primary text-white rounded-br-sm" : "bg-white border border-outline-variant/50 text-on-surface rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-outline-variant shrink-0 z-10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4 max-w-5xl mx-auto">
                <div className="flex-1 relative">
                   <input 
                     type="text" 
                     value={messageInput}
                     onChange={(e) => setMessageInput(e.target.value)}
                     placeholder={`Message ${activeUser.name}...`}
                     className="w-full bg-surface-container-lowest border-2 border-outline-variant py-4 px-6 rounded-full text-body-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={!messageInput.trim()}
                  className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:shadow-lg hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[24px] ml-1">send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-outline bg-[#f8fafc]">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-outline-variant/30 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[48px] text-primary/40">chat_bubble</span>
            </div>
            <h3 className="text-headline-sm font-bold text-on-surface mb-3 tracking-tight">Your Messages</h3>
            <p className="text-body-lg text-center max-w-md bg-white p-5 rounded-2xl shadow-sm border border-outline-variant/30 leading-relaxed text-on-surface-variant">
              Search for a team member on the left to start a text chat. No calls, no files — just messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
