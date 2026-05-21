import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Song = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
  youtube_url?: string;
  cifra_url?: string;
  lyrics?: string;
};

export default function MusicaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Song>(`/songs/${id}`).then(setSong).finally(() => setLoading(false));
  }, [id]);

  const onDelete = () =>
    Alert.alert("Excluir música?", "", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => { await api(`/songs/${id}`, { method: "DELETE" }); router.back(); } },
    ]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.olive} /></SafeAreaView>;
  if (!song) return null;

  return (
    <SafeAreaView style={styles.container} testID="musica-detail">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Música</Text>
        <TouchableOpacity onPress={onDelete} testID="delete-song"><Ionicons name="trash-outline" size={22} color={colors.error} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="musical-notes" size={40} color={colors.gold} />
          <Text style={styles.title}>{song.title}</Text>
          {song.artist ? <Text style={styles.artist}>{song.artist}</Text> : null}
          <View style={styles.badgeRow}>
            {song.key ? <View style={styles.badge}><Text style={styles.badgeText}>Tom: {song.key}</Text></View> : null}
            {song.bpm ? <View style={styles.badge}><Text style={styles.badgeText}>{song.bpm} BPM</Text></View> : null}
          </View>
        </View>

        <View style={styles.linksRow}>
          {song.youtube_url ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(song.youtube_url!)} testID="open-youtube">
              <Ionicons name="logo-youtube" size={20} color={colors.terracotta} />
              <Text style={styles.linkText}>YouTube</Text>
            </TouchableOpacity>
          ) : null}
          {song.cifra_url ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(song.cifra_url!)} testID="open-cifra">
              <Ionicons name="document-text-outline" size={20} color={colors.info} />
              <Text style={styles.linkText}>Cifra</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {song.lyrics ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LETRA / CIFRA</Text>
            <Text style={styles.lyrics}>{song.lyrics}</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg, gap: 16 },
  heroCard: { backgroundColor: colors.olive, borderRadius: radius.xl, padding: spacing.lg, alignItems: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginTop: 12, textAlign: "center" },
  artist: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  badge: { backgroundColor: "rgba(230,185,122,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: colors.gold, fontWeight: "600", fontSize: 12 },
  linksRow: { flexDirection: "row", gap: 12 },
  linkBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  linkText: { fontSize: 13, fontWeight: "600", color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600", marginBottom: 10 },
  lyrics: { fontSize: 14, color: colors.text, lineHeight: 22, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
});
