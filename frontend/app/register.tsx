import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, 
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, spacing } from '@/src/theme';

export default function Register() {
  const router = useRouter();
  const { signup } = useAuth(); // ✅ CORRIGIDO: Usar signup do contexto

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRegister = async () => {
    // Validações
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Preencha nome, email e senha");
      return;
    }

    if (!email.includes("@")) {
      setError("E-mail inválido");
      return;
    }

    if (password.length < 6) {
      setError("Senha deve ter mínimo 6 caracteres");
      return;
    }

    if (!isJoining && !ministryName.trim()) {
      setError("Informe o nome do ministério");
      return;
    }

    if (isJoining && !inviteCode.trim()) {
      setError("Informe o código de convite");
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Enviando cadastro...");

      // ✅ CORRIGIDO: Usar método signup do contexto (sem /api/ prefix)
      const signupData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        ...(isJoining 
          ? { invite_code: inviteCode.trim().toUpperCase() }
          : { ministry_name: ministryName.trim() }
        )
      };

      await signup(signupData);

      console.log("✅ Cadastro realizado com sucesso!");
      
      Alert.alert(
        "Sucesso!", 
        "Conta criada com sucesso!\n\nVocê será redirecionado para o app.",
        [{ 
          text: "OK", 
          onPress: () => router.replace('/(tabs)') 
        }]
      );

    } catch (error: any) {
      console.error("❌ Erro completo:", error);
      const errorMessage = error.message || "Não foi possível criar a conta. Tente novamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Gerencie seu ministério de louvor</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="Nome completo"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!loading}
            style={styles.input}
            maxLength={100}
          />

          <TextInput
            placeholder="E-mail"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            style={styles.input}
          />

          <TextInput
            placeholder="Senha (mín. 6 caracteres)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            style={styles.input}
          />

          {/* Tabs: Criar vs Entrar */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              onPress={() => setIsJoining(false)}
              disabled={loading}
              style={[styles.tab, !isJoining && styles.tabActive]}
            >
              <Text style={[styles.tabText, !isJoining && styles.tabTextActive]}>
                Criar Ministério
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsJoining(true)}
              disabled={loading}
              style={[styles.tab, isJoining && styles.tabActive]}
            >
              <Text style={[styles.tabText, isJoining && styles.tabTextActive]}>
                Entrar com Convite
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input condicional */}
          {!isJoining ? (
            <TextInput
              placeholder="Nome do Ministério"
              placeholderTextColor="#999"
              value={ministryName}
              onChangeText={setMinistryName}
              editable={!loading}
              style={styles.input}
              maxLength={100}
            />
          ) : (
            <TextInput
              placeholder="Código do Convite (ex: ABC123)"
              placeholderTextColor="#999"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              editable={!loading}
              style={styles.input}
              maxLength={6}
            />
          )}

          {/* Mensagem de erro */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Botão Cadastrar */}
          <TouchableOpacity 
            onPress={onRegister}
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>CADASTRAR</Text>
            )}
          </TouchableOpacity>

          {/* Link Login */}
          <TouchableOpacity 
            onPress={() => router.back()} 
            disabled={loading}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Já tem conta? Fazer Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bg
  },
  tabsContainer: {
    flexDirection: 'row',
    marginVertical: spacing.lg,
    gap: spacing.sm
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: '#f0f0f0'
  },
  tabActive: {
    backgroundColor: colors.olive
  },
  tabText: {
    color: '#555',
    fontWeight: '500',
    fontSize: 13
  },
  tabTextActive: {
    color: 'white'
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
    fontWeight: '500'
  },
  button: {
    backgroundColor: colors.olive,
    padding: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.md
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700'
  },
  loginLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md
  },
  loginLinkText: {
    color: colors.olive,
    fontSize: 14,
    fontWeight: '500'
  }
});
