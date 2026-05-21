import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, clearToken, getToken } from "@/src/api/client";
import { registerExpoPushToken } from "@/src/utils/notifications";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "leader" | "member";
  ministry_id: string;
  instruments: string[];
  permissions: string[];
  phone?: string | null;
  avatar_color: string;
};

export const PERMS = {
  EDIT_SCALES: "edit_scales",
  EDIT_SONGS: "edit_songs",
  EDIT_ANNOUNCEMENTS: "edit_announcements",
} as const;

export type Ministry = {
  id: string;
  name: string;
  invite_code: string;
  api_key: string;
  created_by: string;
};

type AuthCtx = {
  user: User | null;
  ministry: Ministry | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    ministry_name?: string;
    invite_code?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      // Certifica-te que estas rotas também existem no server.py como /api/auth/me e /api/ministry
      const me = await api<User>("/auth/me");
      const min = await api<Ministry>("/ministry");
      setUser(me);
      setMinistry(min);
      registerExpoPushToken().catch(() => {});
    } catch {
      await clearToken();
      setUser(null);
      setMinistry(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    // CORREÇÃO: Enviamos /login. O Client.ts já adiciona o /api, resultando em /api/login
    const res = await api<{ token: string; user: User; ministry: Ministry }>("/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await setToken(res.token);
    setUser(res.user);
    setMinistry(res.ministry);
    registerExpoPushToken().catch(() => {});
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    ministry_name?: string;
    invite_code?: string;
  }) => {
    // CORREÇÃO: Enviamos /signup. O Client.ts já adiciona o /api, resultando em /api/signup
    const res = await api<{ token: string; user: User; ministry: Ministry }>("/signup", {
      method: "POST",
      body: data,
      auth: false,
    });
    await setToken(res.token);
    setUser(res.user);
    setMinistry(res.ministry);
  };

  const signOut = async () => {
    await clearToken();
    setUser(null);
    setMinistry(null);
  };

  const refresh = async () => {
    const me = await api<User>("/auth/me");
    const min = await api<Ministry>("/ministry");
    setUser(me);
    setMinistry(min);
  };

  return (
    <Ctx.Provider value={{ user, ministry, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}