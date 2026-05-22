import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';

export const setToken = async (token: string) => {
  await AsyncStorage.setItem('@WorshipManager:token', token);
};

export const api = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('@WorshipManager:token');
  const fullUrl = `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

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
    throw new Error(errorData.detail || `Erro ${response.status}`);
  }

  return await response.json();
};