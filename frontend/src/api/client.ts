import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';

// Exportação explícita para resolver o erro "not a function"
export const setToken = async (token: string) => {
  await AsyncStorage.setItem('@WorshipManager:token', token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem('@WorshipManager:token');
};

export const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await getToken();
    
    // Garante prefixo /api
    const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const fullUrl = `${API_URL}${fullEndpoint}`;

    console.log(`📡 Chamando: ${fullUrl}`);

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