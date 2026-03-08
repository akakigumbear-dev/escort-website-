import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface User {
  email: string;
  phoneNumber?: string;
}

export interface EscortProfile {
  id?: string;
  username: string;
  city: string;
  address: string;
  services: string[];
  height: number;
  weight: number;
  ethnicity: string;
  gender: string;
  languages: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  escortProfile: EscortProfile | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setEscortProfile: (profile: EscortProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  escortProfile: null,
  login: () => {},
  logout: () => {},
  setEscortProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [escortProfile, setEscortProfile] = useState<EscortProfile | null>(null);

  // Restore from localStorage on mount
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

  const updateEscortProfile = useCallback((profile: EscortProfile | null) => {
    setEscortProfile(profile);
    if (profile) {
      localStorage.setItem("escort_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("escort_profile");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, escortProfile, login, logout, setEscortProfile: updateEscortProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
