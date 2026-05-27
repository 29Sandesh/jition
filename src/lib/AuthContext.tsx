import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organisationId: string | null;
  companyId?: string | null;
  avatar?: string | null;
  jobTitle?: string;
  bio?: string;
}

interface Organisation {
  id: string;
  name: string;
  ownerId: string;
}

interface AuthContextType {
  user: User | null;
  organisation: Organisation | null;
  company?: Organisation | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, companyName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        setOrganisation(null);
        return false;
      }
      const data = await res.json();
      setUser(data.user);
      
      // Set the organisation details from the company info in the response
      if (data.company) {
        setOrganisation({
          id: data.company.id || data.company._id,
          name: data.company.name,
          ownerId: data.company.ownerId
        });
      } else if (data.user.organisationId) {
        setOrganisation({ id: data.user.organisationId, name: "My Organisation", ownerId: data.user.id });
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to login");
        setIsLoading(false);
        return false;
      }
      const success = await fetchProfile();
      if (success) {
        toast.success("Login successful");
      }
      setIsLoading(false);
      return success;
    } catch (e) {
      console.error(e);
      toast.error("Failed to login");
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string, companyName?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, companyName })
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to sign up");
        setIsLoading(false);
        return false;
      }
      const success = await fetchProfile();
      if (success) {
        toast.success("Welcome to The CirCle!");
      }
      setIsLoading(false);
      return success;
    } catch (e) {
      console.error(e);
      toast.error("Failed to sign up");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setOrganisation(null);
  };

  const refreshAuth = async () => {
    if (user) {
      await fetchProfile();
    }
  };

  useEffect(() => {
    fetchProfile().finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, organisation, company: organisation, isLoading, login, signup, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
