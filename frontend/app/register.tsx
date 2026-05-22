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
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ministryName, setMinistryName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NOVO: Validar email
  const isValidEmail = (emailToTest: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToTest);
  };

  // ✅ NOVO: Validar campos
  const validateFields = () => {
    setError(null);

    // Validar nome
    const nameClean = name.trim();
    if (!nameClean) {
      setError("Por favor, digite seu nome completo");
      return false;
    }

    if (nameClean.length < 3) {
      setError("Nome deve ter pelo menos 3 caracteres");
      return false;
    }

    // Validar email
    const emailClean = email.trim().toLowerCase();
    if (!emailClean) {
      setError("Por favor, digite seu e-mail");
      return false;
    }

    if (!isValidEmail(emailClean)) {
      setError("E-mail inválido. Digite um e-mail válido (ex: seu@email.com)");
      return false;
    }

    // Validar senha
    if (!password) {
      setError("Por favor, digite uma senha");
      return false;
    }

    if (password.length < 6) {
      setError("Senha deve ter mínimo 6 caracteres");
      return false;
    }

    // Validar ministério OU código de convite
    if (!isJoining) {
      // Criar novo ministério
      const ministryClean = ministryName.trim();
      if (!ministryClean) {
        setError("Por favor, digite o nome do ministério");
        return false;
      }

      if (ministryClean.length < 3) {
        setError("Nome do ministério deve ter pelo menos 3 caracteres");
        return false;
      }
    } else {
      // Entrar com código de convite
      const codeClean = inviteCode.trim().toUpperCase();
      if (!codeClean) {
        setError("Por favor, digite o código de convite");
        return false;
      }

      if (codeClean.length < 6) {
        setError("Código de convite deve ter 6 caracteres");
        return false;
      }

      if (codeClean.length > 6) {
        setError("Código de convite deve ter exatamente 6 caracteres");
        return false;
      }

      // Validar se é apenas números e letras
      if (!/^[A-Z0-9]{6}$/.test(codeClean)) {
        setError("Código de convite deve conter apenas letras e números");
        return false;
      }
    }

    return true;
  };

  const onRegister = async () => {
    // ✅ NOVO: Validar antes de enviar
    if (!validateFields()) {
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Validações passaram, enviando cadastro...");

      // ✅ Preparar dados garantindo campos corretos
      const signupData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        ...(isJoining 
          ? { invite_code: inviteCode.trim().toUpperCase() }
          : { ministry_name: ministryName.trim() }
        )
      };

      console.log("📤 Dados sendo enviados:", signupData);

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
      console.error("❌ Erro no signup:", error);
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
          {/* NOME */}
          <View>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              placeholder="Ex: João da Silva"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              editable={!loading}
              style={styles.input}
              maxLength={100}
            />
          </View>

          {/* EMAIL */}
          <View>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              placeholder="Ex: seu@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              style={styles.input}
            />
          </View>

          {/* SENHA */}
          <View>
            <Text style={styles.label}>Senha (mínimo 6 caracteres) *</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              style={styles.input}
            />
          </View>

          {/* TABS: CRIAR vs ENTRAR */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              onPress={() => {
                setIsJoining(false);
                setError(null);
              }}
              disabled={loading}
              style={[styles.tab, !isJoining && styles.tabActive]}
            >
              <Text style={[styles.tabText, !isJoining && styles.tabTextActive]}>
                Criar Ministério
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                setIsJoining(true);
                setError(null);
              }}
              disabled={loading}
              style={[styles.tab, isJoining && styles.tabActive]}
            >
              <Text style={[styles.tabText, isJoining && styles.tabTextActive]}>
                Entrar com Convite
              </Text>
            </TouchableOpacity>
          </View>

          {/* INPUT CONDICIONAL */}
          {!isJoining ? (
            <View>
              <Text style={styles.label}>Nome do Ministério *</Text>
              <TextInput
                placeholder="Ex: Ministério de Louvor da Igreja"
                placeholderTextColor="#999"
                value={ministryName}
                onChangeText={setMinistryName}
                editable={!loading}
                style={styles.input}
                maxLength={100}
              />
              <Text style={styles.helperText}>
                Este será o nome do seu ministério
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>Código do Convite *</Text>
              <TextInput
                placeholder="Ex: ABC123"
                placeholderTextColor="#999"
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                autoCapitalize="characters"
                editable={!loading}
                style={styles.input}
                maxLength={6}
              />
              <Text style={styles.helperText}>
                Solicite o código a um administrador do ministério
              </Text>
            </View>
          )}

          {/* MENSAGEM DE ERRO */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          {/* BOTÃO CADASTRAR */}
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

          {/* LINK LOGIN */}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.md
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
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: spacing.md
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
  errorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20
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
