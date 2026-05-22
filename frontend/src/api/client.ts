import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL 
  ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` 
  : 'https://worshipmanager-api.onrender.com/api'; // ajuste depois

export const api = {
  async post(endpoint: string, data: any) {
    const token = await AsyncStorage.getItem('@WorshipManager:token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || 'Erro na requisição');
    }
    
    return result;
  },

  async get(endpoint: string) {
    const token = await AsyncStorage.getItem('@WorshipManager:token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || 'Erro na requisição');
    }
    
    return result;
  }
};