import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { signInWithGoogleEmergent } from "@/src/utils/googleAuth";
// ALTERAÇÃO: Importação corrigida com chaves para corresponder às exportações do client.ts
import { api, setToken } from "@/src/api/client"; 
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { setUser, setMinistry, refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha");
      return;
    }
    setLoading(true);
    try {
      // A função api agora tratará automaticamente o prefixo /api se necessário
      const res = await api("/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
        auth: false,
      });

      if (res && res.token) {
        await setToken(res.token);
        
        if (res.user) setUser(res.user);
        if (res.ministry) setMinistry(res.ministry);
        
        await refreshSession();
        
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 100);
      } else {
        setError("Resposta inválida do servidor");
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const session_id = await signInWithGoogleEmergent();
      if (!session_id) {
        setGoogleLoading(false);
        return;
      }
      const res = await api<{ token: string, user: any, ministry: any }>("/auth/google", {
        method: "POST",
        body: { session_id },
        auth: false,
      });
      
      if (res && res.token) {
        await setToken(res.token);
        if (res.user) setUser(res.user);
        if (res.ministry) setMinistry(res.ministry);
        await refreshSession();
        
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 100);
      }
    } catch (e: any) {
      setError(e?.message || "Falha no login com Google");
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.bg} testID="login-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="musical-notes" size={28} color={colors.olive} />
            </View>
            <Text style={styles.brand}>LouvorApp</Text>
            <Text style={styles.tag}>Gestão do seu ministério de louvor</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre com sua conta para continuar</Text>

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              testID="login-email"
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              testID="login-password"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && (
              <Text style={styles.error} testID="login-error">
                {error}
              </Text>
            )}

            <TouchableOpacity
              testID="login-submit"