import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api/client";
import { colors, radius, spacing, shadow, formatDateBR, formatDayName } from "@/src/theme";

type Scale = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  assignments: { user_id: string; user_name: string; instrument: string }[];
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  author_name: string;
  created_at: string;
};

type Stats = {
  total_members: number;
  total_songs: number;
  upcoming_scales: number;
  total_announcements: number;
};

export default function Dashboard() {
  const router = useRouter();
  const { user, ministry } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [nextScale, setNextScale] = useState<Scale | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, scales, anns] = await Promise.all([
        api<Stats>("/stats"),
        api<Scale[]>("/scales"),
        api<Announcement[]>("/announcements"),
      ]);
      setStats(s);
      const today = new Date().toISOString().split("T")[0];
      const upcoming = scales.find((sc) => sc.date >= today);
      setNextScale(upcoming || null);
      setAnnouncements(anns.slice(0, 3));
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const initials = user?.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.olive} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="dashboard-screen" edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Olá, {user?.name?.split(" ")[0]}</Text>
            <Text style={styles.ministry}>{ministry?.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: user?.avatar_color || colors.olive }]}
            onPress={() => router.push("/(tabs)/perfil")}
            testID="dashboard-avatar"
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Next Scale Hero */}
        <Text style={styles.sectionLabel}>PRÓXIMA ESCALA</Text>
        {nextScale ? (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => router.push(`/escala/${nextScale.id}`)}
            testID="dashboard-next-scale"
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroDay}>{formatDayName(nextScale.date)}</Text>
                <Text style={styles.heroDate}>{formatDateBR(nextScale.date)} • {nextScale.time}</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar" size={20} color={colors.gold} />
              </View>
            </View>
            <Text style={styles.heroTitle}>{nextScale.title}</Text>
            {nextScale.location ? <Text style={styles.heroLocation}>📍 {nextScale.location}</Text> : null}
            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterText}>
                {nextScale.assignments.length} {nextScale.assignments.length === 1 ? "músico" : "músicos"}
              </Text>
              <Text style={styles.heroLink}>Ver detalhes →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={colors.textDisabled} />
            <Text style={styles.emptyText}>Nenhuma escala futura</Text>
            <TouchableOpacity onPress={() => router.push("/escala/nova")} testID="empty-create-scale">
              <Text style={styles.linkBold}>Criar primeira escala</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/membros")}
            testID="stat-members"
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={20} color={colors.olive} />
            <Text style={styles.statValue}>{stats?.total_members || 0}</Text>
            <Text style={styles.statLabel}>Membros</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={styles.statArrow} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/repertorio")}
            testID="stat-songs"
            activeOpacity={0.7}
          >
            <Ionicons name="musical-notes" size={20} color={colors.terracotta} />
            <Text style={styles.statValue}>{stats?.total_songs || 0}</Text>
            <Text style={styles.statLabel}>Músicas</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={styles.statArrow} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("/(tabs)/escalas")}
            testID="stat-scales"
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={20} color={colors.info} />
            <Text style={styles.statValue}>{stats?.upcoming_scales || 0}</Text>
            <Text style={styles.statLabel}>Escalas</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={styles.statArrow} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>AÇÕES RÁPIDAS</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/escala/nova")} testID="qa-new-scale">
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="add-circle" size={26} color={colors.olive} />
            </View>
            <Text style={styles.actionText}>Nova Escala</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/musica/nova")} testID="qa-new-song">
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="musical-note" size={26} color={colors.terracotta} />
            </View>
            <Text style={styles.actionText}>Nova Música</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/membros")} testID="qa-members">
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="people" size={26} color={colors.info} />
            </View>
            <Text style={styles.actionText}>Membros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/avisos")} testID="qa-announcements">
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="megaphone" size={26} color={colors.warning} />
            </View>
            <Text style={styles.actionText}>Avisos</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Announcements */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>AVISOS RECENTES</Text>
          <TouchableOpacity onPress={() => router.push("/avisos")}>
            <Text style={styles.linkBold}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum aviso ainda</Text>
          </View>
        ) : (
          announcements.map((a) => (
            <View key={a.id} style={styles.annCard} testID={`announcement-${a.id}`}>
              <Text style={styles.annTitle}>{a.title}</Text>
              <Text style={styles.annMessage} numberOfLines={2}>{a.message}</Text>
              <Text style={styles.annAuthor}>— {a.author_name}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  greeting: { fontSize: 24, fontWeight: "600", color: colors.text },
  ministry: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  sectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.olive,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroDay: { color: colors.gold, fontSize: 12, fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(230,185,122,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "600", marginTop: spacing.md },
  heroLocation: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  heroFooterText: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  heroLink: { color: colors.gold, fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  statArrow: { position: "absolute", top: 12, right: 10 },
  statValue: { fontSize: 22, fontWeight: "600", color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  actionBtn: { alignItems: "center", flex: 1 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionText: { fontSize: 11, color: colors.text, textAlign: "center" },
  annCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  annTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  annMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  annAuthor: { fontSize: 11, color: colors.textDisabled, marginTop: 6, fontStyle: "italic" },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyText: { fontSize: 14, color: colors.textSecondary },
  linkBold: { color: colors.olive, fontWeight: "600", fontSize: 13 },
});
