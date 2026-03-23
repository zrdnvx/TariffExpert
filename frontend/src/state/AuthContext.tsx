import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserProfile = {
  userId: string;
  username: string;
  role: "superadmin" | "org_admin" | "operator";
  organizationId: string;
  organizationName: string;
  cityId: string;
  cityName: string;
};

type AuthContextType = {
  tokens: Tokens | null;
  setTokens: (tokens: Tokens | null) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
};

const STORAGE_KEY = "tariffexpert_tokens";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tokens, setTokensState] = useState<Tokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const raw = Cookies.get(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Tokens;
      if (parsed.accessToken && parsed.refreshToken) {
        setTokensState(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Автовосстановление профиля пользователя при наличии токена (после F5)
  useEffect(() => {
    const loadMe = async () => {
      if (!tokens || user) return;
      try {
        const res = await axios.get<{
          user_id: string;
          username: string;
          role: "superadmin" | "org_admin" | "operator";
          organization_id: string;
          organization_name: string;
          city_id: string;
          city_name: string;
        }>(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        });
        setUser({
          userId: res.data.user_id,
          username: res.data.username,
          role: res.data.role,
          organizationId: res.data.organization_id,
          organizationName: res.data.organization_name,
          cityId: res.data.city_id,
          cityName: res.data.city_name,
        });
      } catch (err) {
        console.error("Failed to restore user from token", err);
        setTokens(null);
      }
    };
    void loadMe();
  }, [tokens, user]);

  const setTokens = (value: Tokens | null) => {
    setTokensState(value);
    if (!value) {
      setUser(null);
    }
    if (value) {
      Cookies.set(STORAGE_KEY, JSON.stringify(value), {
        expires: 30,
        sameSite: "lax",
      });
    } else {
      Cookies.remove(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ tokens, setTokens, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

