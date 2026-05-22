import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';

export const setToken = async (token: string) => {
  await AsyncStorage.setItem('@WorshipManager:token', token);
};

export const api = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('@WorshipManager:token');
  
  // Garante que o caminho não duplica o prefixo /api
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const fullUrl = `${API_URL}${cleanEndpoint}`;

  const response = await fetch(fullUrl, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Erro na requisição");
  }

  return await response.json();
};