import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, clearToken, getToken } from "@/src/api/client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "leader" | "member";
  ministry_id: string;
  instruments: string[];
  phone?: string | null;
  avatar_color: string;
};

export type Ministry = {
  id: string;
  name: string;
  invite_code: string;
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
      const me = await api<User>("/auth/me");
      const min = await api<Ministry>("/ministry");
      setUser(me);
      setMinistry(min);
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
    const res = await api<{ token: string; user: User; ministry: Ministry }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await setToken(res.token);
    setUser(res.user);
    setMinistry(res.ministry);
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    ministry_name?: string;
    invite_code?: string;
  }) => {
    const res = await api<{ token: string; user: User; ministry: Ministry }>("/auth/signup", {
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
