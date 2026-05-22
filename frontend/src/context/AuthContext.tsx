import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

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
  const [token, setToken] = useState<string | null>(null);
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
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedMinistry) setMinistry(JSON.parse(storedMinistry));
      }
    } catch (e) {
      console.log('Erro ao carregar dados salvos');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await api.post('/login', { email, password });
    
    if (response.success) {
      await AsyncStorage.multiSet([
        ['@WorshipManager:token', response.token],
        ['@WorshipManager:user', JSON.stringify(response.user)],
        ['@WorshipManager:ministry', JSON.stringify(response.ministry)]
      ]);

      setToken(response.token);
      setUser(response.user);
      setMinistry(response.ministry);
    } else {
      throw new Error(response.detail || 'Erro ao fazer login');
    }
  }

  async function signup(data: any) {
    const response = await api.post('/signup', data);
    
    if (response.success) {
      await AsyncStorage.multiSet([
        ['@WorshipManager:token', response.token],
        ['@WorshipManager:user', JSON.stringify(response.user)],
        ['@WorshipManager:ministry', JSON.stringify(response.ministry)]
      ]);

      setToken(response.token);
      setUser(response.user);
      setMinistry(response.ministry);
    } else {
      throw new Error(response.detail || 'Erro ao cadastrar');
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove([
      '@WorshipManager:token',
      '@WorshipManager:user',
      '@WorshipManager:ministry'
    ]);
    setToken(null);
    setUser(null);
    setMinistry(null);
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
  return context;
}