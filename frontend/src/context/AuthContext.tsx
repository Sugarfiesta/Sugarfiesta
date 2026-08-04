import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY, User } from "@/src/api";

type AuthState = {
  loading: boolean;
  token: string | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, gender: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const bootstrap = useCallback(async () => {
    const saved = await storage.secureGet(TOKEN_KEY, "");
    if (saved) {
      try {
        const me = await api.me();
        setToken(saved as string);
        setUser(me);
      } catch {
        await storage.secureRemove(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const persist = async (res: { token: string; user: User }) => {
    await storage.secureSet(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const signIn = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res);
  };

  const signUp = async (email: string, password: string, name: string, gender: string) => {
    const res = await api.signup(email, password, name, gender);
    await persist(res);
  };

  const signOut = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{ loading, token, user, signIn, signUp, signOut, refresh, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
