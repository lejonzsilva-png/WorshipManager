import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';

// 1. Exportação explícita das funções para corrigir o erro "(0 , j.setToken) is not a function"
export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem('@WorshipManager:token', token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('@WorshipManager:token');
};

// 2. Função api corrigida
export const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await getToken();
    
    // Garante que a URL fique correta, adicionando o prefixo /api se necessário
    const fullEndpoint = endpoint.startsWith('/api') 
      ? endpoint 
      : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
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