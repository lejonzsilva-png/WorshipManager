import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';
const TOKEN_KEY = '@WorshipManager:token';

// Exportação explícita para ser importada no login.tsx
export const setToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await getToken();
    const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const fullUrl = `${API_URL}${fullEndpoint}`;

    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Erro ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    throw error;
  }
};