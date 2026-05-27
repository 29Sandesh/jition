import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type Density = "comfortable" | "compact";

interface Notifications {
  email: boolean;
  push: boolean;
  tasks: boolean;
  mentions: boolean;
}

interface SettingsState {
  theme: Theme;
  primaryColor: string;
  density: Density;
  workspaceName: string;
  workspaceUrl: string;
  logoBase64: string | null;
  avatarBase64: string | null;
  notifications: Notifications;
  // Workspace Identity
  industry: string;
  companyDescription: string;
  // Company Information (Lead)
  companyLegalName: string;
  foundedYear: string;
  companySize: string;
  companyWebsite: string;
  contactEmail: string;
  location: string;
  twitterHandle: string;
  linkedinHandle: string;
  // Personal Profile
  jobTitle: string;
  bio: string;
}

interface SettingsContextType extends SettingsState {
  setTheme: (theme: Theme) => void;
  setPrimaryColor: (color: string) => void;
  setDensity: (density: Density) => void;
  setWorkspaceName: (name: string) => void;
  setWorkspaceUrl: (url: string) => void;
  setLogoBase64: (base64: string | null) => void;
  setAvatarBase64: (base64: string | null) => void;
  setNotifications: (notifs: Notifications) => void;
  toggleNotification: (key: keyof Notifications) => void;
  setIndustry: (v: string) => void;
  setCompanyDescription: (v: string) => void;
  setCompanyLegalName: (v: string) => void;
  setFoundedYear: (v: string) => void;
  setCompanySize: (v: string) => void;
  setCompanyWebsite: (v: string) => void;
  setContactEmail: (v: string) => void;
  setLocation: (v: string) => void;
  setTwitterHandle: (v: string) => void;
  setLinkedinHandle: (v: string) => void;
  setJobTitle: (v: string) => void;
  setBio: (v: string) => void;
}

const defaultSettings: SettingsState = {
  theme: "light",
  primaryColor: "#0050cb",
  density: "comfortable",
  workspaceName: "The CirCle",
  workspaceUrl: "circle",
  logoBase64: null,
  avatarBase64: null,
  notifications: {
    email: true,
    push: false,
    tasks: true,
    mentions: true,
  },
  industry: "Software",
  companyDescription: "A platform for managing tasks and knowledge.",
  companyLegalName: "StartAPPSS Technologies Pvt. Ltd.",
  foundedYear: "2024",
  companySize: "1-10",
  companyWebsite: "https://startapps.io",
  contactEmail: "support@startapps.io",
  location: "San Francisco, CA",
  twitterHandle: "@startapps",
  linkedinHandle: "company/startapps",
  jobTitle: "Team Member",
  bio: "Passionate about building great products.",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem("kinetic_settings");
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem("kinetic_settings", JSON.stringify(settings));
  }, [settings]);

  // Apply Theme
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const isDark = 
        theme === "dark" || 
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    
    applyTheme(settings.theme);

    // Listen for system preference changes if in system mode
    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  // Apply Primary Color
  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", settings.primaryColor);
    document.documentElement.style.setProperty("--color-primary-container", settings.primaryColor);
  }, [settings.primaryColor]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNotification = (key: keyof Notifications) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  const value = {
    ...settings,
    setTheme: (v: Theme) => updateSetting("theme", v),
    setPrimaryColor: (v: string) => updateSetting("primaryColor", v),
    setDensity: (v: Density) => updateSetting("density", v),
    setWorkspaceName: (v: string) => updateSetting("workspaceName", v),
    setWorkspaceUrl: (v: string) => updateSetting("workspaceUrl", v),
    setLogoBase64: (v: string | null) => updateSetting("logoBase64", v),
    setAvatarBase64: (v: string | null) => updateSetting("avatarBase64", v),
    setNotifications: (v: Notifications) => updateSetting("notifications", v),
    toggleNotification,
    setIndustry: (v: string) => updateSetting("industry", v),
    setCompanyDescription: (v: string) => updateSetting("companyDescription", v),
    setCompanyLegalName: (v: string) => updateSetting("companyLegalName", v),
    setFoundedYear: (v: string) => updateSetting("foundedYear", v),
    setCompanySize: (v: string) => updateSetting("companySize", v),
    setCompanyWebsite: (v: string) => updateSetting("companyWebsite", v),
    setContactEmail: (v: string) => updateSetting("contactEmail", v),
    setLocation: (v: string) => updateSetting("location", v),
    setTwitterHandle: (v: string) => updateSetting("twitterHandle", v),
    setLinkedinHandle: (v: string) => updateSetting("linkedinHandle", v),
    setJobTitle: (v: string) => updateSetting("jobTitle", v),
    setBio: (v: string) => updateSetting("bio", v),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
