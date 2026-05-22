import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Alert } from "react-native";
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
  signInWithGoogle: (token?: string, session_id?: string) => Promise<void>;
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
      console.log("Token recuperado do storage:", token); // <-- DEBUG
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Vamos adicionar logs para ver qual falha primeiro
      const me = await api<User>("/auth/me");
      console.log("Dados do utilizador carregados:", me);
      
      const min = await api<Ministry>("/ministry");
      console.log("Dados do ministério carregados:", min);

      setUser(me);
      setMinistry(min);
      registerExpoPushToken().catch(() => {});
    } catch (error) {
      console.error("ERRO AO CARREGAR SESSÃO:", error); // <-- ONDE ESTÁ O ERRO REAL?
      await clearToken();
      setUser(null);
      setMinistry(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api<{ token: string; user: User; ministry: Ministry }>("/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      await setToken(res.token);
      setUser(res.user);
      setMinistry(res.ministry);
      registerExpoPushToken().catch(() => {});
    } catch (error: any) {
      Alert.alert("Erro no Login", error.message || "Verifique as suas credenciais.");
      throw error;
    }
  };

  const signUp = async (data: {
    name: string;
    email: string;
    password: string;
    ministry_name?: string;
    invite_code?: string;
  }) => {
    try {
      const res = await api<{ token: string; user: User; ministry: Ministry }>("/signup", {
        method: "POST",
        body: data,
        auth: false,
      });
      await setToken(res.token);
      setUser(res.user);
      setMinistry(res.ministry);
    } catch (error: any) {
      Alert.alert("Erro no Registo", error.message || "Não foi possível criar a conta.");
      throw error;
    }
  };

  const signInWithGoogle = async (token?: string, session_id?: string) => {
    try {
      const res = await api<{ token: string; user: User; ministry: Ministry }>("/auth/google", {
        method: "POST",
        body: { token, session_id },
        auth: false,
      });
      await setToken(res.token);
      setUser(res.user);
      setMinistry(res.ministry);
      registerExpoPushToken().catch(() => {});
    } catch (error: any) {
      Alert.alert("Erro no Google", error.message || "Falha ao autenticar com Google.");
      throw error;
    }
  };

  const signOut = async () => {
    await clearToken();
    setUser(null);
    setMinistry(null);
  };

  const refresh = async () => {
    try {
      const me = await api<User>("/auth/me");
      const min = await api<Ministry>("/ministry");
      setUser(me);
      setMinistry(min);
    } catch (error: any) {
      console.error("Erro ao atualizar sessão", error);
    }
  };

  return (
    <Ctx.Provider value={{ user, ministry, loading, signIn, signUp, signInWithGoogle, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function usePermissions() {
  const { user } = useAuth();
  
  const isLeader = user?.role === "leader";
  const canEditScales = isLeader || user?.permissions.includes(PERMS.EDIT_SCALES) || false;
  const canEditSongs = isLeader || user?.permissions.includes(PERMS.EDIT_SONGS) || false;
  const canEditAnnouncements = isLeader || user?.permissions.includes(PERMS.EDIT_ANNOUNCEMENTS) || false;

  return {
    isLeader,
    canEditScales,
    canEditSongs,
    canEditAnnouncements,
  };
}