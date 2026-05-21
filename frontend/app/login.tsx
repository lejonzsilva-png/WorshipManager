import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

const BG_URL =
  "https://static.prod-images.emergentagent.com/jobs/70d88dd2-4187-48d2-aa02-3291c5b28e8e/images/93d8a138dfbe4522f0f3053f62821b8f9ea6408862b1e5e294ad0cb72e9168c7.png";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
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
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_URL }} style={styles.bg} testID="login-screen">
      <View style={styles.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="musical-notes" size={32} color={colors.gold} />
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.olive },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(26, 33, 24, 0.55)" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingTop: 80 },
  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(230,185,122,0.4)",
    marginBottom: spacing.md,
  },
  brand: { color: "#fff", fontSize: 32, fontWeight: "600", letterSpacing: -0.5 },
  tag: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
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
  linkBtn: { marginTop: spacing.md, alignItems: "center" },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkBold: { color: colors.olive, fontWeight: "600" },
});
