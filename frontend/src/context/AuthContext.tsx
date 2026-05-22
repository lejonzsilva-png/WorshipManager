import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken } from '../api/client';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  ministry_id: string;
  avatar_color: string;
};

type Ministry = {
  id: string;
  name: string;
  invite_code: string;
};

type AuthContextData = {
  user: User | null;
  ministry: Ministry | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const storedToken = await AsyncStorage.getItem('@WorshipManager:token');
      const storedUser = await AsyncStorage.getItem('@WorshipManager:user');
      const storedMinistry = await AsyncStorage.getItem('@WorshipManager:ministry');

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedMinistry) setMinistry(JSON.parse(storedMinistry));
      }
    } catch (e) {
      console.log('❌ Erro ao carregar dados salvos:', e);
    } finally {
      setLoading(false);
    }
  }

  // ✅ CORRIGIDO: Usar interface correta de api()
  async function login(email: string, password: string) {
    try {
      const response = await api('/login', {
        method: 'POST',
        body: { email, password }
      });
      
      if (response.success && response.token) {
        await AsyncStorage.multiSet([
          ['@WorshipManager:token', response.token],
          ['@WorshipManager:user', JSON.stringify(response.user)],
          ['@WorshipManager:ministry', JSON.stringify(response.ministry)]
        ]);

        setToken(response.token);
        setTokenState(response.token);
        setUser(response.user);
        setMinistry(response.ministry);
      } else {
        throw new Error(response.detail || 'Erro ao fazer login');
      }
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    }
  }

  // ✅ CORRIGIDO: Remover duplicata, usar interface correta
  async function signup(data: any) {
    try {
      const response = await api('/signup', {
        method: 'POST',
        body: data
      });
      
      if (response.success && response.token) {
        await AsyncStorage.multiSet([
          ['@WorshipManager:token', response.token],
          ['@WorshipManager:user', JSON.stringify(response.user)],
          ['@WorshipManager:ministry', JSON.stringify(response.ministry)]
        ]);

        setToken(response.token);
        setTokenState(response.token);
        setUser(response.user);
        setMinistry(response.ministry);
      } else {
        throw new Error(response.detail || 'Erro ao cadastrar');
      }
    } catch (error: any) {
      console.error('❌ Erro no signup:', error);
      throw new Error(error.message || 'Erro ao cadastrar');
    }
  }

  async function logout() {
    try {
      await AsyncStorage.multiRemove([
        '@WorshipManager:token',
        '@WorshipManager:user',
        '@WorshipManager:ministry'
      ]);
      setToken(null);
      setTokenState(null);
      setUser(null);
      setMinistry(null);
    } catch (error: any) {
      console.error('❌ Erro no logout:', error);
    }
  }

  // ✅ CORRIGIDO: Adicionar função auxiliar para setToken (usada por login.tsx)
  async function setTokenExternal(newToken: string) {
    await setToken(newToken);
    setTokenState(newToken);
  }

  return (
    <AuthContext.Provider value={{
      user,
      ministry,
      token,
      loading,
      login,
      signup,
      logout,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
