import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com/api';

const api = async (endpoint: string, options: any = {}) => {
  try {
    const token = await AsyncStorage.getItem('@WorshipManager:token');
    
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("API Error:", error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }
    throw error;
  }
};

export { api };