import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com';

const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await AsyncStorage.getItem('@WorshipManager:token');
    
    // Garante que a URL fique correta
    const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const fullUrl = `${API_URL}${fullEndpoint}`;

    console.log(`📡 Chamando: ${fullUrl}`); // ← Para debug

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

export { api };