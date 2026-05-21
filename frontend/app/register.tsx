import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha nome, e-mail e senha");
      return;
    }
    if (password.length < 6) {
      setError("Senha precisa ter ao menos 6 caracteres");
      return;
    }
    if (mode === "join" && !inviteCode.trim()) {
      setError("Informe o código de convite");
      return;
    }
    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        ministry_name: mode === "create" ? ministryName.trim() || undefined : undefined,
        invite_code: mode === "join" ? inviteCode.trim().toUpperCase() : undefined,
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      testID="register-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="register-back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Bem-vindo ao LouvorApp</Text>

        <View style={styles.segment}>
          <TouchableOpacity
            testID="mode-create"
            style={[styles.segItem, mode === "create" && styles.segActive]}
            onPress={() => setMode("create")}
          >
            <Text style={[styles.segText, mode === "create" && styles.segTextActive]}>
              Criar ministério
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="mode-join"
            style={[styles.segItem, mode === "join" && styles.segActive]}
            onPress={() => setMode("join")}
          >
            <Text style={[styles.segText, mode === "join" && styles.segTextActive]}>
              Entrar com convite
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          testID="register-name"
          style={styles.input}
          placeholder="João da Silva"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          testID="register-email"
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha (mín. 6 caracteres)</Text>
        <TextInput
          testID="register-password"
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textDisabled}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {mode === "create" ? (
          <>
            <Text style={styles.label}>Nome do ministério (opcional)</Text>
            <TextInput
              testID="register-ministry-name"
              style={styles.input}
              placeholder="Ministério de Louvor IBC"
              placeholderTextColor={colors.textDisabled}
              value={ministryName}
              onChangeText={setMinistryName}
            />
            <Text style={styles.helper}>
              Você será o líder. Use o código gerado para convidar outros.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Código de convite</Text>
            <TextInput
              testID="register-invite-code"
              style={[styles.input, { letterSpacing: 4, fontWeight: "600" }]}
              placeholder="ABC123"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="characters"
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              maxLength={6}
            />
          </>
        )}

        {error && (
          <Text style={styles.error} testID="register-error">
            {error}
          </Text>
        )}

        <TouchableOpacity
          testID="register-submit"
          style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Criar conta</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace("/login")} testID="go-login">
          <Text style={styles.linkText}>
            Já tem conta? <Text style={styles.linkBold}>Entrar</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingTop: 70, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.lg },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    padding: 4,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  segItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.full },
  segActive: { backgroundColor: colors.surface, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  segText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  segTextActive: { color: colors.olive, fontWeight: "600" },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  helper: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  error: { color: colors.error, marginTop: 12, fontSize: 13 },
  btnPrimary: {
    backgroundColor: colors.olive,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: spacing.md, alignItems: "center", padding: 8 },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkBold: { color: colors.olive, fontWeight: "600" },
});
