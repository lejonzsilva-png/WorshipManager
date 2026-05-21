import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { usePermissions } from "@/src/context/AuthContext";
import { confirm } from "@/src/utils/confirm";
import { scaleToText, shareScaleText, shareScalePDF } from "@/src/utils/share";
import { scheduleScaleReminder } from "@/src/utils/notifications";
import { colors, radius, spacing, formatDateBR, formatDayName } from "@/src/theme";

type Scale = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  assignments: { user_id: string; user_name: string; instrument: string }[];
  song_ids: string[];
};

type Song = { id: string; title: string; artist?: string; key?: string; bpm?: number | null };

export default function EscalaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { canEditScales } = usePermissions();
  const [scale, setScale] = useState<Scale | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const s = await api<Scale>(`/scales/${id}`);
      setScale(s);
      if (s.song_ids.length) {
        const all = await api<Song[]>("/songs");
        setSongs(all.filter((x) => s.song_ids.includes(x.id)));
      } else {
        setSongs([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Reload when returning from edit screen
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = () => {
    confirm({
      title: "Excluir escala?",
      message: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      destructive: true,
      onConfirm: async () => {
        await api(`/scales/${id}`, { method: "DELETE" });
        router.back();
      },
    });
  };

  const onShareText = async () => {
    if (!scale) return;
    const text = scaleToText(scale, songs);
    try { await shareScaleText(text, scale.title); } catch (e: any) { alert(e?.message || "Falha ao compartilhar"); }
  };

  const onSharePDF = async () => {
    if (!scale) return;
    try { await shareScalePDF(scale.id, scale.title); } catch (e: any) { alert(e?.message || "Falha ao gerar PDF"); }
  };

  const onScheduleReminder = async () => {
    if (!scale) return;
    if (Platform.OS === "web") { alert("Lembretes locais s\u00f3 funcionam no app mobile."); return; }
    const id = await scheduleScaleReminder(scale);
    if (id) alert("Lembrete agendado para 1 dia antes!");
    else alert("N\u00e3o foi poss\u00edvel agendar (verifique permiss\u00f5es).");
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.olive} /></SafeAreaView>;
  }
  if (!scale) return null;

  return (
    <SafeAreaView style={styles.container} testID="escala-detail">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn"><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <View style={styles.headerActions}>
          {canEditScales && (
            <TouchableOpacity onPress={() => router.push(`/escala/nova?id=${id}`)} testID="edit-scale" style={styles.headerBtn}>
              <Ionicons name="create-outline" size={22} color={colors.olive} />
            </TouchableOpacity>
          )}
          {canEditScales && (
            <TouchableOpacity onPress={onDelete} testID="delete-scale" style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.day}>{formatDayName(scale.date)}</Text>
          <Text style={styles.title}>{scale.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={16} color={colors.gold} />
            <Text style={styles.meta}>{formatDateBR(scale.date)} • {scale.time}</Text>
          </View>
          {scale.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location" size={16} color={colors.gold} />
              <Text style={styles.meta}>{scale.location}</Text>
            </View>
          ) : null}
        </View>

        {scale.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OBSERVAÇÕES</Text>
            <Text style={styles.notes}>{scale.notes}</Text>
          </View>
        ) : null}

        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={onShareText} testID="share-text-btn">
            <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
            <Text style={styles.shareTextLbl}>Compartilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={onSharePDF} testID="share-pdf-btn">
            <Ionicons name="document-text-outline" size={18} color={colors.info} />
            <Text style={styles.shareTextLbl}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={onScheduleReminder} testID="reminder-btn">
            <Ionicons name="notifications-outline" size={18} color={colors.warning} />
            <Text style={styles.shareTextLbl}>Lembrete</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>MÚSICOS ({scale.assignments.length})</Text>
        {scale.assignments.length === 0 ? (
          <Text style={styles.muted}>Nenhum músico atribuído</Text>
        ) : (
          scale.assignments.map((a, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.avatarCircle}><Text style={styles.avatarText}>{a.user_name[0]}</Text></View>
              <Text style={styles.rowName}>{a.user_name}</Text>
              <View style={styles.instrBadge}><Text style={styles.instrText}>{a.instrument}</Text></View>
            </View>
          ))
        )}

        <Text style={styles.section}>REPERTÓRIO ({songs.length})</Text>
        {songs.length === 0 ? (
          <Text style={styles.muted}>Nenhuma música atribuída</Text>
        ) : (
          songs.map((s) => (
            <TouchableOpacity key={s.id} style={styles.row} onPress={() => router.push(`/musica/${s.id}`)} testID={`scale-song-${s.id}`}>
              <Ionicons name="musical-note" size={20} color={colors.terracotta} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.title}</Text>
                {s.artist ? <Text style={styles.muted}>{s.artist}</Text> : null}
              </View>
              {s.key ? <View style={styles.keyBadge}><Text style={styles.keyText}>{s.key}</Text></View> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg, gap: 12 },
  heroCard: { backgroundColor: colors.olive, borderRadius: radius.xl, padding: spacing.lg },
  day: { color: colors.gold, fontSize: 12, fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  meta: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600", marginBottom: 6 },
  notes: { fontSize: 14, color: colors.text, lineHeight: 20 },
  section: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600", marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.olive, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600" },
  rowName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500" },
  instrBadge: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  instrText: { fontSize: 11, color: colors.olive, fontWeight: "600" },
  keyBadge: { backgroundColor: colors.olive, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  keyText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  muted: { color: colors.textSecondary, fontSize: 13 },
  shareRow: { flexDirection: "row", gap: 8 },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  shareTextLbl: { fontSize: 12, fontWeight: "600", color: colors.text },
});
