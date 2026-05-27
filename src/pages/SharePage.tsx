import React, { useState } from "react";
import { toast } from "sonner";

export function SharePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  
  const [members, setMembers] = useState([
    { id: 1, name: "Alex Morgan", email: "alex@example.com", role: "Owner", avatar: "A" },
    { id: 2, name: "Sarah Chen", email: "sarah@example.com", role: "Editor", avatar: "S" },
    { id: 3, name: "David Kim", email: "david@example.com", role: "Viewer", avatar: "D" },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setMembers([...members, {
      id: Date.now(),
      name: email.split('@')[0],
      email,
      role,
      avatar: email.charAt(0).toUpperCase()
    }]);
    
    setEmail("");
    toast.success(`Invitation sent to ${email}`);
  };

  const handleRemove = (id: number) => {
    setMembers(members.filter(m => m.id !== id));
    toast.success("Member removed");
  };

  return (
    <div className="p-gutter max-w-[800px] mx-auto w-full pb-20">
      <div className="mb-8">
        <h2 className="text-headline-xl font-headline-xl text-on-surface tracking-tight mb-2">Share Workspace</h2>
        <p className="text-body-lg text-on-surface-variant">Invite team members and manage their access permissions.</p>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl p-8 mb-8 shadow-sm">
        <h3 className="text-title-md font-bold text-on-surface mb-4">Invite people</h3>
        <form onSubmit={handleInvite} className="flex gap-4">
          <input 
            type="email" 
            placeholder="Enter email addresses..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-2 border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
          >
            <option value="Viewer">Viewer</option>
            <option value="Editor">Editor</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
            Invite
          </button>
        </form>
      </div>

      <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="text-title-md font-bold text-on-surface">Current Members</h3>
        </div>
        <div className="divide-y divide-outline-variant">
          {members.map((member) => (
            <div key={member.id} className="p-6 flex items-center justify-between hover:bg-surface-container-lowest transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                  {member.avatar}
                </div>
                <div>
                  <h4 className="text-label-lg font-bold text-on-surface">{member.name}</h4>
                  <p className="text-body-sm text-on-surface-variant">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {member.role === "Owner" ? (
                  <span className="text-label-md text-outline font-medium px-4">Owner</span>
                ) : (
                  <>
                    <select 
                      defaultValue={member.role}
                      className="px-3 py-1.5 border border-outline-variant rounded-md text-label-sm bg-white focus:outline-none focus:border-primary"
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Editor">Editor</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <button 
                      onClick={() => handleRemove(member.id)}
                      className="text-error hover:bg-error/10 p-2 rounded-md transition-colors"
                      title="Remove access"
                    >
                      <span className="material-symbols-outlined text-[20px]">person_remove</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
