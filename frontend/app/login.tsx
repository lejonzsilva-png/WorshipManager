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
import { api, setToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn, refresh } = useAuth();
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
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const session_id = await signInWithGoogleEmergent();
      if (!session_id) {
        // On web the page navigates away; on native we return here on cancel
        setGoogleLoading(false);
        return;
      }
      const res = await api<{ token: string }>("/auth/google", {
        method: "POST",
        body: { session_id },
        auth: false,
      });
      await setToken(res.token);
      await refresh();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "Falha no login com Google");
    } finally {
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

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              testID="login-google"
              style={[styles.btnGoogle, googleLoading && { opacity: 0.6 }]}
              onPress={onGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.btnGoogleText}>Continuar com Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="go-register"
              style={styles.linkBtn}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.linkText}>
                Não tem conta? <Text style={styles.linkBold}>Criar conta</Text>
              </Text>
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
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingTop: 80 },
  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  brand: { color: colors.text, fontSize: 32, fontWeight: "600", letterSpacing: -0.5 },
  tag: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.error, marginTop: 8, fontSize: 13 },
  btnPrimary: {
    backgroundColor: colors.olive,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textDisabled, fontSize: 12 },
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGoogleText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  linkBtn: { marginTop: spacing.md, alignItems: "center" },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkBold: { color: colors.olive, fontWeight: "600" },
});
