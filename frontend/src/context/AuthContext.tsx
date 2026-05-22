import React, { createContext, useState, useEffect, useContext } from "react";
import { User, Ministry } from "../types"; // Ajusta o caminho se necessário
import { getToken, clearToken, api } from "../api/client";

type AuthContextType = {
  user: User | null;
  ministry: Ministry | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setMinistry: (ministry: Ministry | null) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSession = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setUser(null);
        setMinistry(null);
        setLoading(false);
        return;
      }

      // Procura os dados no servidor seguro absoluta
      const me = await api<User>("/auth/me");
      const min = await api<Ministry>("/ministry");

      setUser(me);
      setMinistry(min);
    } catch (error) {
      console.error("ERRO CRÍTICO NO LOAD_SESSION:", error);
      // Se o token for inválido/antigo, limpa e força ir para o Login
      await clearToken();
      setUser(null);
      setMinistry(null);
    } finally {
      // GARANTE que o spinner desaparece independentemente de dar erro ou sucesso
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const logout = async () => {
    setLoading(true);
    await clearToken();
    setUser(null);
    setMinistry(null);
    setLoading(false);
  };

  const refreshSession = async () => {
    await loadSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ministry,
        loading,
        setUser,
        setMinistry,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);