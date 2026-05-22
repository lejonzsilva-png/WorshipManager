import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://worshipmanageraapp.onrender.com/api';

const api = async (endpoint: string, options: any = {}) => {
  const token = await AsyncStorage.getItem('@WorshipManager:token');
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Erro na requisição');
  }

  return await response.json();
};

export { api };