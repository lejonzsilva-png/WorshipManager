import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, usePermissions } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

export default function Convidar() {
  const router = useRouter();
  const { ministry } = useAuth();
  const { isLeader } = usePermissions();

  useEffect(() => {
    if (ministry && !isLeader) {
      Alert.alert("Acesso restrito", "Apenas líderes podem convidar novos membros.");
      router.replace("/(tabs)");
    }
  }, [isLeader, ministry, router]);

  const code = ministry?.invite_code || "";
  const ministryName = ministry?.name || "nosso ministério";
  const message =
    `Olá! Você foi convidado para participar do ${ministryName} no LouvorApp 🎵\n\n` +
    `Use o código de convite: *${code}*\n\n` +
    `Baixe o app e escolha "Entrar com convite" no cadastro para entrar no time.`;

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copiado!", `Código ${code} copiado.`);
  };

  const copyMessage = async () => {
    await Clipboard.setStringAsync(message);
    Alert.alert("Copiado!", "Mensagem completa copiada para colar onde quiser.");
  };

  const openWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const webFallback = `https://wa.me/?text=${encodeURIComponent(message)}`;
    try {
      const can = await Linking.canOpenURL(url);
      await Linking.openURL(can ? url : webFallback);
    } catch {
      await Linking.openURL(webFallback);
    }
  };

  const openSMS = async () => {
    const sep = Platform.OS === "ios" ? "&" : "?";
    const url = `sms:${sep}body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o app de mensagens.");
    }
  };

  const nativeShare = async () => {
    try {
      await Share.share({ message, title: `Convite — ${ministryName}` });
    } catch {}
  };

  if (!ministry) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="convidar-screen" edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Membro</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={28} color={colors.gold} />
          </View>
          <Text style={styles.title}>Convide um músico</Text>
          <Text style={styles.subtitle}>
            Compartilhe o código abaixo. Quem usar entra direto no {ministryName}.
          </Text>

          <TouchableOpacity style={styles.codeBox} onPress={copyCode} testID="tap-copy-code">
            <Text style={styles.codeLabel}>CÓDIGO DE CONVITE</Text>
            <Text style={styles.codeValue}>{code}</Text>
            <View style={styles.copyHint}>
              <Ionicons name="copy-outline" size={14} color={colors.gold} />
              <Text style={styles.copyHintText}>Toque para copiar</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>COMPARTILHAR VIA</Text>

        <TouchableOpacity style={[styles.actionBtn, styles.whatsBtn]} onPress={openWhatsApp} testID="share-whatsapp">
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.actionTextLight}>Enviar pelo WhatsApp</Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={openSMS} testID="share-sms">
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.info} />
          <Text style={styles.actionText}>Enviar por SMS / Mensagem</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={nativeShare} testID="share-native">
          <Ionicons name="share-social" size={22} color={colors.olive} />
          <Text style={styles.actionText}>Mais opções (Compartilhar…)</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={copyMessage} testID="copy-full-message">
          <Ionicons name="document-text-outline" size={22} color={colors.terracotta} />
          <Text style={styles.actionText}>Copiar mensagem completa</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning} />
          <Text style={styles.tipText}>
            O convidado só precisa abrir o app, escolher <Text style={styles.bold}>"Entrar com convite"</Text>{" "}
            no cadastro e digitar o código.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.md,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg, gap: 10 },
  heroCard: {
    backgroundColor: colors.olive,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(230,185,122,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19 },
  codeBox: {
    marginTop: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 24,
    alignItems: "center", alignSelf: "stretch",
    borderWidth: 1, borderColor: "rgba(230,185,122,0.3)",
  },
  codeLabel: { color: colors.gold, fontSize: 10, letterSpacing: 1.4, fontWeight: "700" },
  codeValue: { color: "#fff", fontSize: 36, fontWeight: "700", letterSpacing: 8, marginTop: 4 },
  copyHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  copyHintText: { color: colors.gold, fontSize: 11 },
  section: {
    fontSize: 11, letterSpacing: 1.2, fontWeight: "700",
    color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 4,
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  whatsBtn: { backgroundColor: "#25D366", borderColor: "#25D366" },
  actionText: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.text },
  actionTextLight: { flex: 1, fontSize: 15, fontWeight: "600", color: "#fff" },
  tipCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#FFF8EC", borderRadius: radius.md,
    padding: 12, marginTop: spacing.md, borderWidth: 1, borderColor: "#F0DDB0",
  },
  tipText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
  bold: { fontWeight: "700" },
  muted: { color: colors.textSecondary, fontSize: 14 },
});
