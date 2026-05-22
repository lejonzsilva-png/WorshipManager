// ✅ ARQUIVO: client.ts CORRIGIDO COM MELHOR TRATAMENTO DE ERROS

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

  console.log(`📤 Enviando ${options.method || 'GET'} para:`, fullUrl);
  console.log(`📦 Body:`, options.body);

  const response = await fetch(fullUrl, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  console.log(`📨 Status:`, response.status);

  // ✅ NOVO: Tenta extrair mensagem de erro da resposta
  let responseData;
  try {
    responseData = await response.json();
    console.log(`📋 Response:`, responseData);
  } catch (e) {
    console.error('❌ Erro ao fazer parse do JSON:', e);
    responseData = {};
  }

  if (!response.ok) {
    // ✅ NOVO: Extrai mensagem de erro de diferentes formatos
    let errorMessage = 'Erro na requisição';
    
    if (responseData.detail) {
      errorMessage = responseData.detail;
    } else if (responseData.message) {
      errorMessage = responseData.message;
    } else if (responseData.error) {
      errorMessage = responseData.error;
    } else if (response.status === 422) {
      // Erro de validação Pydantic
      if (responseData.errors && Array.isArray(responseData.errors)) {
        errorMessage = responseData.errors
          .map((err: any) => `${err.loc?.[1] || 'Campo'}: ${err.msg}`)
          .join('; ');
      } else if (responseData.detail && Array.isArray(responseData.detail)) {
        errorMessage = responseData.detail
          .map((err: any) => typeof err === 'string' ? err : err.msg || JSON.stringify(err))
          .join('; ');
      } else {
        errorMessage = `Erro de validação (422): dados inválidos`;
      }
    }
    
    console.error(`❌ Erro ${response.status}:`, errorMessage);
    throw new Error(errorMessage);
  }

  return responseData;
};
