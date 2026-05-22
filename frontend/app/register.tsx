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
import { api, setToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function Register() {
  const router = useRouter();
  const { setUser, setMinistry } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRegister = async () => {
    setError(null);
    
    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha todos os campos obrigatórios (Nome, E-mail e Senha)");
      return;
    }

    if (isJoining && !inviteCode.trim()) {
      setError("Introduza o código de convite do seu ministério");
      return;
    }

    if (!isJoining && !ministryName.trim()) {
      setError("Introduza o nome do novo ministério a criar");
      return;
    }

    setLoading(true);
    try {
            const response = await api('/api/auth/signup', {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password,
          ministry_name: !isJoining ? ministryName.trim() : undefined,
          invite_code: isJoining ? inviteCode.trim().toUpperCase() : undefined,
        }
      });

      if (res && res.token) {
        // 1. Grava o token de autenticação de forma segura
        await setToken(res.token);
        
        // 2. Alimenta diretamente o estado global de forma segura com fallbacks estruturados
        setUser(res.user || {
          id: "user-temporary",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: isJoining ? "member" : "leader",
          avatar_color: colors.olive
        });
        
        setMinistry(res.ministry || {
          id: "ministry-temporary",
          name: isJoining ? "Ministério Vinculado" : ministryName.trim(),
          invite_code: isJoining ? inviteCode.trim().toUpperCase() : "ABC123"
        });
        
        // 3. Transição direta com pequeno delay para evitar conflito de renderização
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 150);
        
      } else {
        setError("Resposta inválida do servidor ao criar conta");
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao criar conta. Verifique os dados.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg} testID="register-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.brandWrap}>
            <Text style={styles.brand}>Criar Conta</Text>
            <Text style={styles.tag}>Junte-se ou crie um ministério de louvor</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="O seu nome"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Senha *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.toggleRow}>
              <TouchableOpacity 
                style={[styles.toggleTab, isJoining && styles.toggleTabActive]} 
                onPress={() => { setIsJoining(true); setError(null); }}
              >
                <Text style={[styles.toggleTabText, isJoining && styles.toggleTabTextActive]}>Tenho Código</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleTab, !isJoining && styles.toggleTabActive]} 
                onPress={() => { setIsJoining(false); setError(null); }}
              >
                <Text style={[styles.toggleTabText, !isJoining && styles.toggleTabTextActive]}>Novo Ministério</Text>
              </TouchableOpacity>
            </View>

            {isJoining ? (
              <View>
                <Text style={styles.label}>Código de Convite *</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="EX: ABC123"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="characters"
                  maxLength={6}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                />
                <Text style={styles.inputHelp}>Solicite o código de 6 dígitos ao líder do seu ministério.</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Nome do Ministério *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Ministério de Louvor Central"
                  placeholderTextColor={colors.textDisabled}
                  value={ministryName}
                  onChangeText={setMinistryName}
                />
              </View>
            )}

            {error && (
              <Text style={styles.error}>
                {error}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
              onPress={onRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Concluir Cadastro</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push("/login")}>
              <Text style={styles.linkText}>
                Já tem uma conta? <Text style={styles.linkBold}>Fazer Login</Text>
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
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingTop: 60 },
  backBtn: { position: "absolute", top: 50, left: spacing.lg, zIndex: 10, padding: 4 },
  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  brand: { color: colors.text, fontSize: 28, fontWeight: "600", letterSpacing: -0.5 },
  tag: { color: colors.textSecondary, fontSize: 14, marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  codeInput: { textAlign: "center", fontWeight: "700", fontSize: 18, letterSpacing: 2, color: colors.olive },
  inputHelp: { fontSize: 11, color: colors.textSecondary, marginTop: 4, paddingHorizontal: 4 },
  toggleRow: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, marginTop: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  toggleTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.sm },
  toggleTabActive: { backgroundColor: colors.surface },
  toggleTabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  toggleTabTextActive: { color: colors.olive, fontWeight: "600" },
  error: { color: colors.error, marginTop: 12, fontSize: 13, fontWeight: "500" },
  btnPrimary: {
    backgroundColor: colors.olive,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { marginTop: spacing.md, alignItems: "center" },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkBold: { color: colors.olive, fontWeight: "600" },
});