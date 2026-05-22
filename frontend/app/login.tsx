import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { signInWithGoogleEmergent } from "@/src/utils/googleAuth";
import { api, setToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { setUser, setMinistry, refreshSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha");
      return;
    }
    setLoading(true);
    try {
      const res = await api("/login", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), password },
      });
      if (res && res.token) {
        await setToken(res.token);
        if (res.user) setUser(res.user);
        await refreshSession();
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <TextInput
              testID="login-email"
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              testID="login-password"
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            
            {/* CORREÇÃO AQUI: Garanta que todas as tags estão fechadas corretamente */}
            <TouchableOpacity
              testID="login-submit"
              style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
              onPress={onLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: radius.md, marginBottom: 10 },
  error: { color: colors.error, marginBottom: 10 },
  btnPrimary: { backgroundColor: colors.olive, padding: 16, borderRadius: radius.full, alignItems: "center" },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});