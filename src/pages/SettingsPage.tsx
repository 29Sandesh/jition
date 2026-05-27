import React, { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useSettings } from "../lib/SettingsContext";
import { useAuth } from "../lib/AuthContext";
import Cropper from 'react-easy-crop';

// Image loading and cropping utility
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Resize output to max 512x512 if it's too large, keeping aspect ratio
  const MAX_SIZE = 512;
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > MAX_SIZE) {
    targetHeight = Math.round((MAX_SIZE * targetHeight) / targetWidth);
    targetWidth = MAX_SIZE;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL("image/jpeg", 0.7);
}

export function SettingsPage() {
  const { user, organisation: company, logout, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const settings = useSettings();

  // Local draft state for General Settings
  const [draftName, setDraftName] = useState(settings.workspaceName);
  const [draftUrl, setDraftUrl] = useState(settings.workspaceUrl);
  const [draftIndustry, setDraftIndustry] = useState(settings.industry);
  const [draftDesc, setDraftDesc] = useState(settings.companyDescription);
  
  const [draftLegalName, setDraftLegalName] = useState(settings.companyLegalName);
  const [draftFounded, setDraftFounded] = useState(settings.foundedYear);
  const [draftSize, setDraftSize] = useState(settings.companySize);
  const [draftWebsite, setDraftWebsite] = useState(settings.companyWebsite);
  const [draftContactEmail, setDraftContactEmail] = useState(settings.contactEmail);
  const [draftLocation, setDraftLocation] = useState(settings.location);
  const [draftTwitter, setDraftTwitter] = useState(settings.twitterHandle);
  const [draftLinkedin, setDraftLinkedin] = useState(settings.linkedinHandle);
  
  const [draftJobTitle, setDraftJobTitle] = useState(user?.jobTitle || settings.jobTitle);
  const [draftBio, setDraftBio] = useState(user?.bio || settings.bio);
  const [draftPersonalName, setDraftPersonalName] = useState(user?.name || "");
  const [draftAvatar, setDraftAvatar] = useState(user?.avatar || settings.avatarBase64 || "");
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  // Keep drafts synced if global settings change externally
  useEffect(() => {
    setDraftName(settings.workspaceName);
    setDraftUrl(settings.workspaceUrl);
    setDraftIndustry(settings.industry);
    setDraftDesc(settings.companyDescription);
    setDraftLegalName(settings.companyLegalName);
    setDraftFounded(settings.foundedYear);
    setDraftSize(settings.companySize);
    setDraftWebsite(settings.companyWebsite);
    setDraftContactEmail(settings.contactEmail);
    setDraftLocation(settings.location);
    setDraftTwitter(settings.twitterHandle);
    setDraftLinkedin(settings.linkedinHandle);
    setDraftJobTitle(settings.jobTitle);
    setDraftBio(settings.bio);
  }, [
    settings.workspaceName, settings.workspaceUrl, settings.industry, settings.companyDescription,
    settings.companyLegalName, settings.foundedYear, settings.companySize, settings.companyWebsite,
    settings.contactEmail, settings.location, settings.twitterHandle, settings.linkedinHandle,
    settings.jobTitle, settings.bio
  ]);

  // Crop Modal State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropTarget, setCropTarget] = useState<"logo" | "avatar">("logo");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSaveGeneral = async () => {
    // Save settings locally
    settings.setWorkspaceName(draftName);
    settings.setWorkspaceUrl(draftUrl);
    settings.setIndustry(draftIndustry);
    settings.setCompanyDescription(draftDesc);
    settings.setCompanyLegalName(draftLegalName);
    settings.setFoundedYear(draftFounded);
    settings.setCompanySize(draftSize);
    settings.setCompanyWebsite(draftWebsite);
    settings.setContactEmail(draftContactEmail);
    settings.setLocation(draftLocation);
    settings.setTwitterHandle(draftTwitter);
    settings.setLinkedinHandle(draftLinkedin);
    settings.setJobTitle(draftJobTitle);
    settings.setBio(draftBio);

    // Save profile to backend
    try {
      const orgId = user?.organisationId || "";
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organisation-id": orgId,
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify({
          name: draftPersonalName,
          avatar: draftAvatar,
          jobTitle: draftJobTitle,
          bio: draftBio
        })
      });

      if (res.ok) {
        toast.success("Profile and settings saved successfully!");
        await refreshAuth();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save profile details");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync profile changes with server");
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file.");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (cropTarget === "logo") {
        settings.setLogoBase64(croppedImageBase64);
        toast.success("Logo updated successfully!");
      } else {
        setDraftAvatar(croppedImageBase64);
        settings.setAvatarBase64(croppedImageBase64);
        toast.success("Avatar updated successfully!");
      }
      setImageSrc(null); // Close modal
    } catch (e) {
      console.error(e);
      toast.error("Failed to crop image.");
    } finally {
      setIsCropping(false);
    }
  };
  
  const tabs = [
    { id: "general", label: "User Profile", icon: "person" },
    { id: "company", label: "Company Profile", icon: "business" },
    { id: "members", label: "Members", icon: "group" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
  ];

  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Workspace-scoped member management states
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [workspaceRoles, setWorkspaceRoles] = useState<Record<string, string>>({});

  const fetchWorkspaceMembers = async (wsId: string) => {
    try {
      const orgId = user?.organisationId || "";
      const res = await fetch(`/api/workspaces/${wsId}/members`, { 
        headers: { "x-organisation-id": orgId, "x-user-id": user?.id || "" } 
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(data);
        
        // Find current user's role in this workspace
        const currentMember = data.find((m: any) => m._id === user?.id);
        if (currentMember) {
          setWorkspaceRoles(prev => ({ ...prev, [wsId]: currentMember.workspaceRole }));
        } else if (user?.role === "Owner" || user?.role === "Admin") {
          setWorkspaceRoles(prev => ({ ...prev, [wsId]: user.role }));
        } else {
          setWorkspaceRoles(prev => ({ ...prev, [wsId]: "Viewer" }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWorkspaceChange = (wsId: string) => {
    setSelectedWorkspaceId(wsId);
    fetchWorkspaceMembers(wsId);
  };

  const handleAddWorkspaceMember = async () => {
    if (!inviteEmail.trim() || !selectedWorkspaceId) return;
    try {
      const orgId = user?.organisationId || "";
      const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organisation-id": orgId,
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (res.ok) {
        toast.success("Member added to workspace!");
        setInviteEmail("");
        fetchWorkspaceMembers(selectedWorkspaceId);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add member");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleWorkspaceRoleChange = async (userIdStr: string, newRole: string) => {
    try {
      const orgId = user?.organisationId || "";
      const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/members/${userIdStr}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organisation-id": orgId,
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        toast.success("Role updated successfully!");
        fetchWorkspaceMembers(selectedWorkspaceId);
      } else {
        toast.error("Failed to update role");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleRemoveWorkspaceMember = async (userIdStr: string) => {
    if (!window.confirm("Remove this user from the workspace?")) return;
    try {
      const orgId = user?.organisationId || "";
      const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/members/${userIdStr}`, {
        method: "DELETE",
        headers: {
          "x-organisation-id": orgId,
          "x-user-id": user?.id || ""
        }
      });
      if (res.ok) {
        toast.success("Member removed from workspace");
        fetchWorkspaceMembers(selectedWorkspaceId);
      } else {
        toast.error("Failed to remove member");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  useEffect(() => {
    if (user) {
      setDraftPersonalName(user.name || "");
      setDraftJobTitle(user.jobTitle || "");
      setDraftBio(user.bio || "");
      setDraftAvatar(user.avatar || "");
    }
    if (activeTab === "members") {
      // Fetch workspaces
      const orgId = user?.organisationId || "";
      fetch("/api/workspaces", { 
        headers: { "x-organisation-id": orgId, "x-user-id": user?.id || "" } 
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setWorkspaces(data);
            if (data.length > 0) {
              setSelectedWorkspaceId(data[0]._id);
              fetchWorkspaceMembers(data[0]._id);
            }
          }
        })
        .catch(console.error);

      if (user?.role === "Lead" || user?.role === "Owner" || user?.role === "Admin") {
        // Mock requests to prevent crashes
        setRequests([]);
      }
        
      fetch("/api/organisations/members", { headers: { "x-user-id": user.id, "x-company-id": user.companyId || "" }})
        .then(res => res.json())
        .then(setMembers)
        .catch(console.error);
    }
  }, [activeTab, user]);

  const handleApprove = async (reqId: string) => {
    const res = await fetch(`/api/companies/requests/${reqId}/approve`, {
      method: "POST",
      headers: { "x-user-id": user!.id, "x-company-id": user!.companyId || "" }
    });
    if (res.ok) {
      toast.success("User approved!");
      setRequests(requests.filter(r => r.id !== reqId));
    }
  };

  const handleReject = async (reqId: string) => {
    const res = await fetch(`/api/companies/requests/${reqId}/reject`, {
      method: "POST",
      headers: { "x-user-id": user!.id, "x-company-id": user!.companyId || "" }
    });
    if (res.ok) {
      toast.success("User rejected.");
      setRequests(requests.filter(r => r.id !== reqId));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto w-full relative mt-4">
      <div className="flex gap-8 items-start">
        <div className="w-64 shrink-0 sticky top-8">
          <nav className="flex flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left relative overflow-hidden group",
                  activeTab === tab.id ? "text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={cn("material-symbols-outlined text-[20px] relative z-10", activeTab === tab.id ? "text-primary" : "")}>{tab.icon}</span>
                <span className="text-label-md relative z-10">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex-1 glass-panel rounded-2xl p-8 overflow-hidden relative min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {activeTab === "general" && (
                <div className="space-y-12 pb-8">
                  {/* Section 1: Your Profile */}
                  <div>
                    <h3 className="text-title-lg font-bold text-on-surface border-b border-outline-variant pb-4 mb-6">Your Profile</h3>
                    
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative group shrink-0">
                        <input 
                          type="file" 
                          accept="image/*"
                          ref={avatarInputRef}
                          onChange={(e) => {
                            setCropTarget("avatar");
                            handleFileChange(e);
                          }}
                          className="hidden" 
                        />
                        <div 
                          onClick={() => avatarInputRef.current?.click()}
                          className="w-24 h-24 rounded-full bg-primary flex flex-col items-center justify-center text-white font-headline-xl shadow-md cursor-pointer overflow-hidden border-4 border-surface"
                        >
                          {draftAvatar ? (
                            <img src={draftAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            draftPersonalName ? draftPersonalName[0].toUpperCase() : "U"
                          )}
                        </div>
                        <div 
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity"
                        >
                          <span className="material-symbols-outlined text-white mb-1">add_a_photo</span>
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-label-md font-bold text-on-surface mb-2">Display Name</label>
                            <input 
                              type="text" 
                              value={draftPersonalName}
                              onChange={(e) => setDraftPersonalName(e.target.value)}
                              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                            />
                          </div>
                          <div>
                            <label className="block text-label-md font-bold text-on-surface mb-2">Job Title / Role</label>
                            <div className="relative">
                              <select 
                                value={draftJobTitle}
                                onChange={(e) => setDraftJobTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium appearance-none"
                              >
                                <option value="">Select a role...</option>
                                <option value="Founder & CEO">Founder & CEO</option>
                                <option value="Product Manager">Product Manager</option>
                                <option value="Software Engineer">Software Engineer</option>
                                <option value="Designer">Designer</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Sales">Sales</option>
                                <option value="Other">Other</option>
                              </select>
                              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Account Email</label>
                          <div className="px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface-variant font-medium flex items-center gap-2 cursor-not-allowed">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            {user?.email || "user@example.com"}
                          </div>
                          <p className="text-[12px] text-on-surface-variant mt-1 ml-1">Contact support to change your account email.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-label-md font-bold text-on-surface">Personal Bio</label>
                        <span className="text-label-sm text-on-surface-variant">{draftBio.length}/150</span>
                      </div>
                      <textarea 
                        value={draftBio}
                        onChange={(e) => setDraftBio(e.target.value)}
                        maxLength={150}
                        rows={2}
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium resize-none" 
                        placeholder="A short bio about yourself..."
                      />
                    </div>
                  </div>

                  {/* Section 4: Account & Security */}
                  <div>
                    <h3 className="text-title-lg font-bold text-on-surface border-b border-outline-variant pb-4 mb-6">Account & Security</h3>
                    
                    <div className="flex flex-col sm:flex-row gap-6 mb-8">
                      <div className="flex-1 p-5 rounded-2xl border border-outline-variant bg-surface-container-lowest flex flex-col justify-center">
                        <h4 className="font-bold text-on-surface mb-1 text-label-lg">Account Status</h4>
                        <p className="text-body-sm text-on-surface-variant">Member since May 2026</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant hover:bg-surface-container-lowest transition-colors">
                        <div>
                          <h4 className="font-bold text-on-surface text-label-lg">Password</h4>
                          <p className="text-body-sm text-on-surface-variant">Last changed 2 months ago</p>
                        </div>
                        <button 
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 border border-outline-variant rounded-lg text-label-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
                        >
                          Change Password
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant hover:bg-surface-container-lowest transition-colors">
                        <div>
                          <h4 className="font-bold text-on-surface text-label-lg">Sessions</h4>
                          <p className="text-body-sm text-on-surface-variant">Sign out of all other active sessions</p>
                        </div>
                        <button className="px-4 py-2 border border-outline-variant rounded-lg text-label-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
                          Sign Out All
                        </button>
                      </div>
                    </div>
                    
                    {/* moved Delete Account to the footer area so actions line up */}
                  </div>

                  {/* Sticky Save Button */}
                  <div className="sticky bottom-4 pt-4 mt-8 flex items-center justify-between gap-4 bg-surface/85 backdrop-blur-md z-10 border-t border-transparent px-4">
                    <div className="flex items-center">
                      <button className="flex items-center gap-2 text-error font-bold text-label-md hover:underline">
                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                        Delete Account
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => logout()}
                        className="px-6 py-2.5 rounded-lg font-bold text-label-md border border-error text-error hover:bg-error/10 transition-colors shadow-sm"
                      >
                        Sign Out
                      </button>
                      <button 
                        onClick={handleSaveGeneral}
                        className="px-6 py-2.5 rounded-lg font-bold text-label-md bg-primary text-white hover:opacity-90 transition-opacity shadow-md"
                      >
                        Save All Changes
                      </button>
                    </div>
                  </div>
                  
                  {/* Password Modal */}
                  {showPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-surface rounded-2xl shadow-xl border border-outline-variant w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-outline-variant">
                          <h3 className="text-title-lg font-bold text-on-surface">Change Password</h3>
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <label className="block text-label-md font-bold text-on-surface mb-2">Current Password</label>
                            <input type="password" value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface" />
                          </div>
                          <div>
                            <label className="block text-label-md font-bold text-on-surface mb-2">New Password</label>
                            <input type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface" />
                          </div>
                          <div>
                            <label className="block text-label-md font-bold text-on-surface mb-2">Confirm New Password</label>
                            <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface" />
                          </div>
                        </div>
                        <div className="p-4 bg-surface-container-low flex justify-end gap-2 border-t border-outline-variant">
                          <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-lg font-bold text-label-md text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
                          <button 
                            onClick={async () => { 
                              if (pwdNew !== pwdConfirm) {
                                toast.error("New passwords do not match!");
                                return;
                              }
                              try {
                                const res = await fetch("/api/auth/change-password", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
                                  body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setShowPasswordModal(false); 
                                  toast.success("Password updated successfully"); 
                                  setPwdCurrent(""); 
                                  setPwdNew(""); 
                                  setPwdConfirm(""); 
                                } else {
                                  toast.error(data.error || "Failed to update password");
                                }
                              } catch(e) {
                                toast.error("An error occurred");
                              }
                            }} 
                            className="px-4 py-2 rounded-lg font-bold text-label-md bg-primary text-white hover:opacity-90 transition-colors"
                          >
                            Update Password
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

          {activeTab === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-8">
                <div className="flex justify-between items-center mb-8 border-b border-outline-variant pb-4">
                  <h2 className="text-headline-sm font-bold text-on-surface">Company Profile</h2>
                </div>

                {user?.role === "Lead" || user?.role === "Owner" || user?.role === "Admin" ? (
                  <div className="space-y-12">
                    <div>
                      <div className="flex items-center gap-6 mb-8">
                        <input 
                          type="file" 
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={(e) => {
                            setCropTarget("logo");
                            handleFileChange(e);
                          }}
                          className="hidden" 
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant cursor-pointer hover:border-primary hover:text-primary transition-colors bg-surface-container-lowest overflow-hidden relative shrink-0"
                        >
                          {settings.logoBase64 ? (
                            <img src={settings.logoBase64} alt="Workspace Logo" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[32px] mb-1">add_photo_alternate</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider">Logo</span>
                            </>
                          )}
                        </div>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface mb-1">Workspace Logo</h4>
                          <p className="text-body-sm text-on-surface-variant mb-3">Upload a square image. Automatically compressed to save space.</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 border border-outline-variant rounded-lg text-label-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
                          >
                            Upload Image
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Workspace Name</label>
                          <input 
                            type="text" 
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium" 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Workspace URL</label>
                          <div className="flex items-stretch focus-within:ring-1 focus-within:ring-primary rounded-xl overflow-hidden transition-all border border-outline-variant">
                            <span className="px-3 py-3 bg-surface-container-low border-r border-outline-variant text-on-surface-variant font-medium flex items-center whitespace-nowrap text-sm">thecircle.app/</span>
                            <input 
                              type="text" 
                              value={draftUrl}
                              onChange={(e) => setDraftUrl(e.target.value)}
                              className="w-full px-3 py-3 bg-surface-container-lowest border-none focus:outline-none text-on-surface font-medium" 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Industry</label>
                          <div className="relative">
                            <select 
                              value={draftIndustry}
                              onChange={(e) => setDraftIndustry(e.target.value)}
                              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium appearance-none"
                            >
                              <option value="Software">Software</option>
                              <option value="Finance">Finance</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Consulting">Consulting</option>
                              <option value="Healthcare">Healthcare</option>
                              <option value="Education">Education</option>
                              <option value="Other">Other</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="block text-label-md font-bold text-on-surface">Company Description</label>
                          <span className="text-label-sm text-on-surface-variant">{draftDesc.length}/200</span>
                        </div>
                        <textarea 
                          value={draftDesc}
                          onChange={(e) => setDraftDesc(e.target.value)}
                          maxLength={200}
                          rows={3}
                          className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface font-medium resize-none" 
                          placeholder="Short bio shown on profile..."
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-title-lg font-bold text-on-surface border-b border-outline-variant pb-4 mb-6">Company Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Company Legal Name</label>
                        <input 
                          type="text" 
                          value={draftLegalName}
                          onChange={(e) => setDraftLegalName(e.target.value)}
                          className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                          placeholder="e.g. StartAPPSS Technologies Pvt. Ltd."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Founded Year</label>
                          <input 
                            type="text" 
                            value={draftFounded}
                            onChange={(e) => setDraftFounded(e.target.value)}
                            className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                            placeholder="e.g. 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-label-md font-bold text-on-surface mb-2">Company Size</label>
                          <div className="relative">
                            <select 
                              value={draftSize}
                              onChange={(e) => setDraftSize(e.target.value)}
                              className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium appearance-none"
                            >
                              <option value="1-10">1-10</option>
                              <option value="11-50">11-50</option>
                              <option value="51-200">51-200</option>
                              <option value="200+">200+</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Company Website</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">language</span>
                          <input 
                            type="url" 
                            value={draftWebsite}
                            onChange={(e) => setDraftWebsite(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                            placeholder="https://"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Support / Contact Email</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">mail</span>
                          <input 
                            type="email" 
                            value={draftContactEmail}
                            onChange={(e) => setDraftContactEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                            placeholder="support@company.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Location / Headquarters</label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">location_on</span>
                          <input 
                            type="text" 
                            value={draftLocation}
                            onChange={(e) => setDraftLocation(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                            placeholder="City, Country"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Social - Twitter/X</label>
                        <input 
                          type="text" 
                          value={draftTwitter}
                          onChange={(e) => setDraftTwitter(e.target.value)}
                          className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                          placeholder="@handle"
                        />
                      </div>
                      <div>
                        <label className="block text-label-md font-bold text-on-surface mb-2">Social - LinkedIn</label>
                        <input 
                          type="text" 
                          value={draftLinkedin}
                          onChange={(e) => setDraftLinkedin(e.target.value)}
                          className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary transition-all text-on-surface font-medium" 
                          placeholder="company/handle"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 block">lock</span>
                    <h3 className="text-title-lg font-bold text-on-surface mb-2">Restricted Access</h3>
                    <p className="text-on-surface-variant max-w-md mx-auto">Only workspace leads can modify company information. Contact your administrator if you need to update these details.</p>
                  </div>
                )}
                
                {(user?.role === "Lead" || user?.role === "Owner" || user?.role === "Admin") && (
                  <div className="flex justify-end pt-8 mt-8 border-t border-outline-variant">
                    <button 
                      onClick={handleSaveGeneral}
                      className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-primary/90 transition-all shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}



              {activeTab === "notifications" && (
                <div className="space-y-8">
                   <h3 className="text-title-lg font-bold text-on-surface border-b border-outline-variant pb-4">Notifications</h3>
                   <div className="space-y-6">
                     {[
                       { id: "email", title: "Email Notifications", desc: "Receive daily digests and critical alerts via email.", active: settings.notifications.email },
                       { id: "push", title: "Push Notifications", desc: "Get real-time updates pushed to your browser or device.", active: settings.notifications.push },
                       { id: "tasks", title: "Task Assignments", desc: "Notify me when I am assigned a new task.", active: settings.notifications.tasks },
                       { id: "mentions", title: "Mentions", desc: "Notify me when someone @mentions me in a comment.", active: settings.notifications.mentions },
                     ].map((item, i) => (
                       <div 
                         key={i} 
                         onClick={() => settings.toggleNotification(item.id as keyof typeof settings.notifications)}
                         className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-outline transition-colors cursor-pointer"
                       >
                         <div>
                           <h4 className="text-label-lg font-bold text-on-surface mb-1">{item.title}</h4>
                           <p className="text-body-sm text-on-surface-variant">{item.desc}</p>
                         </div>
                         <div className={cn("w-12 h-6 rounded-full flex items-center p-1 transition-colors duration-300", item.active ? "bg-primary" : "bg-surface-container-high")}>
                           <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300", item.active ? "translate-x-6" : "translate-x-0")}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-8">
                   <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                     <div>
                       <h3 className="text-title-lg font-bold text-on-surface">Workspace Member Roles</h3>
                       <p className="text-body-sm text-on-surface-variant">Configure user roles on a per-workspace level.</p>
                     </div>
                   </div>

                   {/* Workspace Selector Dropdown */}
                   <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
                     <label className="text-label-md font-bold text-on-surface whitespace-nowrap">Select Workspace:</label>
                     <div className="relative flex-1 max-w-xs">
                       <select 
                         value={selectedWorkspaceId} 
                         onChange={e => handleWorkspaceChange(e.target.value)}
                         className="w-full px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-xl focus:outline-none focus:border-primary font-medium cursor-pointer"
                       >
                         {workspaces.map(ws => (
                           <option key={ws._id} value={ws._id}>{ws.name}</option>
                         ))}
                       </select>
                     </div>
                   </div>

                   {/* Add Member Form */}
                   {(user?.role === "Owner" || user?.role === "Admin" || workspaceRoles[selectedWorkspaceId] === "Owner" || workspaceRoles[selectedWorkspaceId] === "Admin") && (
                     <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
                       <h4 className="text-label-md font-bold text-on-surface">Add User to Workspace</h4>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <input 
                           type="email" 
                           placeholder="Enter member's email address..." 
                           value={inviteEmail}
                           onChange={e => setInviteEmail(e.target.value)}
                           className="flex-1 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-body-md text-on-surface"
                         />
                         <div className="flex gap-2">
                           <select 
                             value={inviteRole}
                             onChange={e => setInviteRole(e.target.value)}
                             className="px-3 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant rounded-lg focus:outline-none text-body-md"
                           >
                             <option value="Owner">Owner</option>
                             <option value="Admin">Admin</option>
                             <option value="Editor">Editor</option>
                             <option value="Member">Member</option>
                             <option value="Viewer">Viewer</option>
                           </select>
                           <button 
                             onClick={handleAddWorkspaceMember}
                             className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap"
                           >
                             Add User
                           </button>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Team Roster */}
                   <div>
                     <h4 className="text-label-lg font-bold text-on-surface mb-4">Workspace Roster</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {workspaceMembers.map(member => {
                         const isSelf = member._id === user?.id;
                         const isAdminOrOwner = user?.role === "Owner" || user?.role === "Admin" || workspaceRoles[selectedWorkspaceId] === "Owner" || workspaceRoles[selectedWorkspaceId] === "Admin";
                         const showControls = isAdminOrOwner && !isSelf && member.workspaceRole !== "Owner";

                         const avatarColor = member.workspaceRole === "Owner" || member.workspaceRole === "Admin" 
                           ? "bg-primary/20 text-primary" 
                           : "bg-surface-container-high text-on-surface-variant";

                         return (
                           <div key={member._id} className="flex flex-col p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-sm transition-shadow">
                             <div className="flex items-start gap-4 mb-2">
                               <div className="relative">
                                 <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-title-sm font-bold shadow-inner overflow-hidden", avatarColor)}>
                                   {member.avatar ? (
                                     <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                   ) : (
                                     member.name.split(" ").map((n: string) => n[0]).join("").substring(0,2).toUpperCase()
                                   )}
                                 </div>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start flex-wrap gap-2">
                                   <h5 className="font-bold text-on-surface truncate">{member.name} {isSelf && "(You)"}</h5>
                                   
                                   {showControls ? (
                                     <div className="flex items-center gap-1.5">
                                       <select
                                         value={member.workspaceRole}
                                         onChange={(e) => handleWorkspaceRoleChange(member._id, e.target.value)}
                                         className="text-[10px] font-bold px-2 py-0.5 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-md focus:outline-none cursor-pointer uppercase"
                                       >
                                         <option value="Owner">Owner</option>
                                         <option value="Admin">Admin</option>
                                         <option value="Editor">Editor</option>
                                         <option value="Member">Member</option>
                                         <option value="Viewer">Viewer</option>
                                       </select>
                                       <button 
                                         onClick={() => handleRemoveWorkspaceMember(member._id)}
                                         className="p-1 text-error hover:bg-error/5 rounded"
                                         title="Remove from Workspace"
                                       >
                                         <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                       </button>
                                     </div>
                                   ) : (
                                     <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", 
                                       (member.workspaceRole === "Owner" || member.workspaceRole === "Admin") ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"
                                     )}>
                                       {member.workspaceRole}
                                     </span>
                                   )}
                                 </div>
                                 <p className="text-body-sm text-on-surface-variant truncate">{member.email}</p>
                                 <p className="text-[10px] text-outline uppercase mt-0.5">Org Role: {member.orgRole}</p>
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   {/* Roles Guide Panel */}
                   <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5">
                     <h4 className="text-label-lg font-bold text-on-surface mb-3">Roles & Permissions Reference</h4>
                     <div className="overflow-x-auto">
                       <table className="w-full text-left text-body-sm text-on-surface-variant border-collapse">
                         <thead>
                           <tr className="border-b border-outline-variant">
                             <th className="py-2 font-bold text-on-surface">Role</th>
                             <th className="py-2 font-bold text-on-surface">Manage Workspace</th>
                             <th className="py-2 font-bold text-on-surface">Add Projects</th>
                             <th className="py-2 font-bold text-on-surface">Create Tasks/Epics</th>
                             <th className="py-2 font-bold text-on-surface">View Only</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-outline-variant/30">
                           <tr>
                             <td className="py-2 font-bold text-on-surface">Owner / Admin</td>
                             <td className="py-2 text-success">✅ Yes</td>
                             <td className="py-2 text-success">✅ Yes</td>
                             <td className="py-2 text-success">✅ Yes</td>
                             <td className="py-2">❌ No</td>
                           </tr>
                           <tr>
                             <td className="py-2 font-bold text-on-surface">Editor</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2 text-success">✅ Yes</td>
                             <td className="py-2">❌ No</td>
                           </tr>
                           <tr>
                             <td className="py-2 font-bold text-on-surface">Member</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2 text-success">✅ (Read + Comment)</td>
                           </tr>
                           <tr>
                             <td className="py-2 font-bold text-on-surface">Viewer</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2">❌ No</td>
                             <td className="py-2 text-success">✅ (Read Only)</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </div>

                    {(user?.role === "Lead" || user?.role === "Owner" || user?.role === "Admin") && (
                      <div className="pt-4">
                        <h4 className="text-label-lg font-bold text-on-surface mb-4">Pending Requests</h4>
                        {requests.length === 0 ? (
                          <p className="text-body-sm text-on-surface-variant">No pending join requests.</p>
                        ) : (
                          <div className="space-y-3">
                            {requests.map(req => (
                              <div key={req.id} className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-xl">
                                <div>
                                  <p className="font-bold text-on-surface">{req.userName}</p>
                                  <p className="text-body-sm text-on-surface-variant">{req.userEmail}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleReject(req.id)}
                                    className="px-4 py-2 border border-outline-variant text-error rounded-lg font-bold hover:bg-error/5 transition-colors"
                                  >
                                    Reject
                                  </button>
                                  <button 
                                    onClick={() => handleApprove(req.id)}
                                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
                                  >
                                    Approve
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                 </div>
              )}


            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Image Crop Modal */}
      <AnimatePresence>
        {imageSrc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                <h3 className="font-bold text-on-surface text-title-md">Crop Image</h3>
                <button 
                  onClick={() => setImageSrc(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="relative h-[400px] w-full bg-gray-900">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // Lock to 1:1 square
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-6 bg-surface-container-lowest border-t border-outline-variant space-y-4">
                <div>
                  <label className="text-label-sm font-bold text-on-surface-variant mb-2 block">Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setImageSrc(null)}
                    className="px-6 py-2.5 rounded-lg font-bold text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApplyCrop}
                    disabled={isCropping}
                    className="px-6 py-2.5 rounded-lg font-bold text-label-md bg-primary text-white hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
                  >
                    {isCropping ? "Applying..." : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">crop</span>
                        Apply Crop
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
