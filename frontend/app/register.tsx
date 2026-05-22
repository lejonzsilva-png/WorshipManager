import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api/client';

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    // Validações
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Erro", "Preencha nome, email e senha");
      return;
    }

    if (!isJoining && !ministryName.trim()) {
      Alert.alert("Erro", "Informe o nome do ministério");
      return;
    }

    if (isJoining && !inviteCode.trim()) {
      Alert.alert("Erro", "Informe o código de convite");
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Enviando cadastro...");

      const response = await api('/api/signup', {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          ministry_name: !isJoining ? ministryName.trim() : undefined,
          invite_code: isJoining ? inviteCode.trim().toUpperCase() : undefined,
        }
      });

      console.log("✅ Resposta da API:", response);

      if (response.success) {
        Alert.alert(
          "Sucesso!", 
          "Cadastro realizado com sucesso!\n\nVocê será redirecionado.",
          [{ text: "OK", onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        Alert.alert("Erro", "Resposta inválida do servidor");
      }
    } catch (error: any) {
      console.error("❌ Erro completo:", error);
      Alert.alert(
        "Falha no Cadastro", 
        error.message || "Não foi possível conectar ao servidor. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' }}>
        Criar Conta
      </Text>

      <TextInput
        placeholder="Nome completo"
        value={name}
        onChangeText={setName}
        style={inputStyle}
      />

      <TextInput
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={inputStyle}
      />

      <TextInput
        placeholder="Senha (mín. 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={inputStyle}
      />

      <View style={{ flexDirection: 'row', marginVertical: 15 }}>
        <TouchableOpacity 
          onPress={() => setIsJoining(false)}
          style={[tabStyle, !isJoining && activeTabStyle]}
        >
          <Text style={!isJoining ? activeTabText : tabText}>Criar Ministério</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsJoining(true)}
          style={[tabStyle, isJoining && activeTabStyle]}
        >
          <Text style={isJoining ? activeTabText : tabText}>Entrar com Convite</Text>
        </TouchableOpacity>
      </View>

      {!isJoining ? (
        <TextInput
          placeholder="Nome do Ministério"
          value={ministryName}
          onChangeText={setMinistryName}
          style={inputStyle}
        />
      ) : (
        <TextInput
          placeholder="Código do Convite (ex: ABC123)"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          style={inputStyle}
        />
      )}

      <TouchableOpacity 
        onPress={onRegister}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={buttonText}>CADASTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: 'center', color: '#007AFF', fontSize: 16 }}>
          Já tem conta? Fazer Login
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Estilos
const inputStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  padding: 14,
  marginBottom: 12,
  borderRadius: 10,
  fontSize: 16,
};

const tabStyle = {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginHorizontal: 4,
  backgroundColor: '#f0f0f0',
};

const activeTabStyle = {
  backgroundColor: '#007AFF',
};

const tabText = {
  color: '#555',
  fontWeight: '500',
};

const activeTabText = {
  color: 'white',
  fontWeight: 'bold',
};

const buttonStyle = {
  backgroundColor: '#007AFF',
  padding: 16,
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 10,
};

const buttonText = {
  color: 'white',
  fontSize: 18,
  fontWeight: 'bold',
};