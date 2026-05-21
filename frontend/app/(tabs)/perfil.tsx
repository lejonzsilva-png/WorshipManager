import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const INSTRUMENTS = [
  "Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado",
  "Piano", "Cajon", "Saxofone", "Trompete", "Backing Vocal",
];

export default function Perfil() {
  const router = useRouter();
  const { user, ministry, signOut, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [instruments, setInstruments] = useState<string[]>(user?.instruments || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setInstruments(user?.instruments || []);
  }, [user]);

  const toggleInstrument = (i: string) => {
    setInstruments((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await api("/auth/me", { method: "PUT", body: { name, phone, instruments } });
      await refresh();
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const copyCode = async () => {
    if (ministry?.invite_code) {
      await Clipboard.setStringAsync(ministry.invite_code);
      Alert.alert("Copiado!", `Código ${ministry.invite_code} copiado para a área de transferência`);
    }
  };

  const copyApiKey = async () => {
    if (ministry?.api_key) {
      await Clipboard.setStringAsync(ministry.api_key);
      Alert.alert("Copiado!", "Chave de API copiada para a área de transferência");
    }
  };

  const rotateApiKey = () => {
    Alert.alert(
      "Rotacionar chave?",
      "A chave atual será invalidada imediatamente. Apps externos terão que ser reconfigurados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rotacionar", style: "destructive", onPress: async () => {
            try {
              await api("/ministry/api-key/rotate", { method: "POST" });
              await refresh();
              Alert.alert("Sucesso", "Nova chave gerada");
            } catch (e: any) {
              Alert.alert("Erro", e.message || "Falha ao rotacionar");
            }
          },
        },
      ]
    );
  };

  const onLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", style: "destructive", onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const initials = user?.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} testID="perfil-screen" edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Perfil</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} testID="edit-profile">
              <Ionicons name="create-outline" size={24} color={colors.olive} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onSave} disabled={saving} testID="save-profile">
              {saving ? (
                <ActivityIndicator color={colors.olive} />
              ) : (
                <Text style={styles.linkBold}>Salvar</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: user.avatar_color }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.role === "leader" && (
            <View style={styles.roleBadge}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={styles.roleText}>Líder do ministério</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ministério</Text>
          <Text style={styles.ministryName}>{ministry?.name}</Text>
          <TouchableOpacity style={styles.inviteRow} onPress={copyCode} testID="copy-invite">
            <View>
              <Text style={styles.inviteLabel}>CÓDIGO DE CONVITE</Text>
              <Text style={styles.inviteCode}>{ministry?.invite_code}</Text>
            </View>
            <Ionicons name="copy-outline" size={22} color={colors.olive} />
          </TouchableOpacity>
        </View>

        {user.role === "leader" && ministry?.api_key ? (
          <View style={styles.card}>
            <View style={styles.apiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>INTEGRAÇÃO / API</Text>
                <Text style={styles.apiHelp}>
                  Use esta chave para conectar apps externos (ex: metrônomo) ao seu ministério.
                </Text>
              </View>
              <Ionicons name="code-slash" size={22} color={colors.info} />
            </View>

            <TouchableOpacity style={styles.apiKeyBox} onPress={copyApiKey} testID="copy-api-key">
              <Text style={styles.apiKeyText} numberOfLines={1} ellipsizeMode="middle">
                {ministry.api_key}
              </Text>
              <Ionicons name="copy-outline" size={18} color={colors.olive} />
            </TouchableOpacity>

            <View style={styles.apiActions}>
              <TouchableOpacity
                style={styles.apiBtn}
                onPress={() => router.push("/api-docs")}
                testID="api-docs-btn"
              >
                <Ionicons name="book-outline" size={16} color={colors.olive} />
                <Text style={styles.apiBtnText}>Ver documentação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.apiBtn, styles.apiBtnDanger]}
                onPress={rotateApiKey}
                testID="rotate-api-key"
              >
                <Ionicons name="refresh" size={16} color={colors.error} />
                <Text style={[styles.apiBtnText, { color: colors.error }]}>Rotacionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {editing ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Informações</Text>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                testID="profile-name"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
              <Text style={styles.label}>Telefone</Text>
              <TextInput
                testID="profile-phone"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Instrumentos</Text>
              <View style={styles.chipsWrap}>
                {INSTRUMENTS.map((i) => {
                  const active = instruments.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleInstrument(i)}
                      testID={`chip-${i}`}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{i}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meus instrumentos</Text>
            {instruments.length === 0 ? (
              <Text style={styles.muted}>Nenhum instrumento informado</Text>
            ) : (
              <View style={styles.chipsWrap}>
                {instruments.map((i) => (
                  <View key={i} style={[styles.chip, styles.chipActive]}>
                    <Text style={[styles.chipText, styles.chipTextActive]}>{i}</Text>
                  </View>
                ))}
              </View>
            )}
            {user.phone ? <Text style={styles.muted}>📞 {user.phone}</Text> : null}
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} testID="logout-btn">
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  linkBold: { color: colors.olive, fontWeight: "600", fontSize: 15 },
  avatarWrap: { alignItems: "center", marginBottom: spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "600" },
  userName: { fontSize: 20, fontWeight: "600", color: colors.text, marginTop: 12 },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceElevated, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.full, marginTop: 10,
  },
  roleText: { fontSize: 11, color: colors.olive, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600", marginBottom: 8 },
  ministryName: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: spacing.md },
  inviteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    padding: 12, borderRadius: radius.md,
  },
  inviteLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600" },
  inviteCode: { fontSize: 22, fontWeight: "700", color: colors.olive, letterSpacing: 4, marginTop: 2 },
  apiHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 },
  apiHelp: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  apiKeyBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: radius.md,
  },
  apiKeyText: { flex: 1, fontFamily: "monospace", fontSize: 12, color: colors.text },
  apiActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  apiBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  apiBtnDanger: { borderColor: colors.error },
  apiBtnText: { color: colors.olive, fontSize: 12, fontWeight: "600" },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.olive, borderColor: colors.olive },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.surface, paddingVertical: 14, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.error, marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: "600", fontSize: 15 },
});
