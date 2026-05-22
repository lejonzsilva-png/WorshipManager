import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { signInWithGoogleEmergent } from "@/src/utils/googleAuth";
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth(); // ✅ CORRIGIDO: Usar apenas login do contexto
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    
    // Validações
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha");
      return;
    }

    if (!email.includes("@")) {
      setError("E-mail inválido");
      return;
    }

    setLoading(true);
    
    try {
      // ✅ CORRIGIDO: Usar método login do contexto (sem duplicar /api/)
      await login(email.toLowerCase(), password);
      
      // Se chegou aqui, login foi bem-sucedido
      // O contexto já salvou token, user e ministry
      router.replace("/(tabs)");
      
    } catch (e: any) {
      console.error("❌ Erro no login:", e);
      setError(e.message || "Erro ao entrar. Verifique suas credenciais.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.title}>LouvorApp</Text>
            <Text style={styles.subtitle}>Gerenciador de Ministério de Louvor</Text>

            <TextInput
              testID="login-email"
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              testID="login-password"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            {error && <Text style={styles.error}>{error}</Text>}
            
            {/* ✅ CORRIGIDO: Usar apenas método login do contexto */}
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

            <TouchableOpacity style={styles.linkContainer}>
              <Text style={styles.link}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.btnSecondary}
              onPress={() => router.push("/register")}
              disabled={loading}
            >
              <Text style={styles.btnSecondaryText}>Criar Conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1 
  },
  bg: { 
    flex: 1, 
    backgroundColor: colors.bg 
  },
  scroll: { 
    flexGrow: 1, 
    justifyContent: "center", 
    padding: spacing.lg 
  },
  card: { 
    backgroundColor: colors.surface, 
    padding: spacing.lg, 
    borderRadius: radius.xl, 
    borderWidth: 1, 
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: colors.text
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.xl,
    color: "#666"
  },
  input: { 
    backgroundColor: colors.bg, 
    borderWidth: 1, 
    borderColor: colors.border, 
    padding: 14, 
    borderRadius: radius.md, 
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.text
  },
  error: { 
    color: colors.error, 
    marginBottom: spacing.md,
    fontSize: 14,
    fontWeight: "500"
  },
  btnPrimary: { 
    backgroundColor: colors.olive, 
    padding: 16, 
    borderRadius: radius.full, 
    alignItems: "center",
    marginBottom: spacing.md
  },
  btnPrimaryText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  linkContainer: {
    alignItems: "center",
    marginBottom: spacing.lg
  },
  link: {
    color: colors.olive,
    fontSize: 14,
    fontWeight: "500"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.olive,
    padding: 14,
    borderRadius: radius.full,
    alignItems: "center"
  },
  btnSecondaryText: {
    color: colors.olive,
    fontSize: 16,
    fontWeight: "600"
  }
});
