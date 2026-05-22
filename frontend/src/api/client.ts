import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';
const TOKEN_KEY = '@WorshipManager:token';

// 1. Exportações necessárias para o login.tsx funcionar
export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

// 2. A função api que já estavas a usar, otimizada
export const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await getToken();
    
    // Garante o prefixo /api e formatação da URL
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
      console.error("Erro da API:", errorData);
      throw new Error(errorData.detail || `Erro ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    if (error.message.includes('Failed to fetch') || error.message.includes('load failed')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }
    throw error;
  }
};