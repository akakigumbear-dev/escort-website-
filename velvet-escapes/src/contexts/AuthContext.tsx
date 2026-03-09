import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getMyProfile } from "@/lib/profile-api";
import { apiFetch } from "@/lib/api";

export type UserRole = "CLIENT" | "ESCORT";

export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  balance?: number;
  role?: UserRole;
}

export interface EscortProfile {
  id?: string;
  username: string;
  city: string;
  address: string;
  phoneNumber?: string;
  bio?: string;
  age?: number;
  subscriptionPriceGel?: number | null;
  services?: string[];
  height?: number;
  weight?: number;
  ethnicity?: string;
  gender?: string;
  languages?: string[];
  prices?: Array<{ id: string; serviceLocation: string; price30min?: number | null; price1hour?: number | null; priceWholeNight?: number | null }>;
  pictures?: Array<{ id: string; picturePath: string; isProfilePicture: boolean; isExclusive?: boolean; mediaType?: string | null }>;
  subscriberPhotos?: Array<{ id: string; picturePath: string; mediaType?: string | null; sortOrder: number }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  escortProfile: EscortProfile | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setEscortProfile: (profile: EscortProfile | null) => void;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  escortProfile: null,
  login: () => {},
  logout: () => {},
  setEscortProfile: () => {},
  refreshBalance: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [escortProfile, setEscortProfile] = useState<EscortProfile | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");
    const savedProfile = localStorage.getItem("escort_profile");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        if (savedProfile) setEscortProfile(JSON.parse(savedProfile));
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("escort_profile");
      }
    }
  }, []);

  const updateEscortProfile = useCallback((profile: EscortProfile | null) => {
    setEscortProfile(profile);
    if (profile) {
      localStorage.setItem("escort_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("escort_profile");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    getMyProfile()
      .then((profile) => updateEscortProfile(profile as EscortProfile))
      .catch(() => updateEscortProfile(null));
  }, [token, updateEscortProfile]);

  // Fetch fresh user data (balance etc.) when token is set
  useEffect(() => {
    if (!token) return;
    apiFetch("/auth/me")
      .then((me) => {
        setUser((prev) => {
          const updated = { ...prev!, balance: me.balance, phoneNumber: me.phoneNumber, role: me.role };
          localStorage.setItem("auth_user", JSON.stringify(updated));
          return updated;
        });
      })
      .catch(() => {});
  }, [token]);

  const login = useCallback((u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem("auth_token", t);
    localStorage.setItem("auth_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setEscortProfile(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("escort_profile");
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!token) return;
    try {
      const me = await apiFetch("/auth/me");
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, balance: me.balance };
        localStorage.setItem("auth_user", JSON.stringify(updated));
        return updated;
      });
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, escortProfile, login, logout, setEscortProfile: updateEscortProfile, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
};
