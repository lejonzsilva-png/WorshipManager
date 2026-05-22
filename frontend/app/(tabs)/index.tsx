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
  
  // Lógica de permissões baseada no role do utilizador
  const isLeader = user?.role === "leader" || user?.role === "admin";
  const canEditScales = isLeader || user?.role === "operator";
  const canEditRepertoire = isLeader || user?.role === "musician";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_members: 0,
    total_songs: 0,
    upcoming_scales: 0,
    total_announcements: 0,
  });
  const [nextScale, setNextScale] = useState<Scale | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const loadDashboardData = async () => {
    try {
      const [statsData, scalesData, annData] = await Promise.all([
        api<Stats>("/dashboard/stats"),
        api<Scale[]>("/scales?limit=1"),
        api<Announcement[]>("/announcements?limit=2"),
      ]);

      if (statsData) setStats(statsData);
      if (scalesData && scalesData.length > 0) setNextScale(scalesData[0]);
      if (annData) setAnnouncements(annData);
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.olive} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.olive} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Olá, {user?.name || "Utilizador"}</Text>
            <Text style={styles.ministryName}>{ministry?.name || "Nenhum ministério vinculado"}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push("/profile")}>
            <Ionicons name="person-circle-outline" size={36} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/membros")}>
            <Ionicons name="people" size={24} color={colors.olive} />
            <Text style={styles.statValue}>{stats.total_members}</Text>
            <Text style={styles.statLabel}>Integrantes</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={styles.statArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/repertorio")}>
            <Ionicons name="musical-notes" size={24} color={colors.olive} />
            <Text style={styles.statValue}>{stats.total_songs}</Text>
            <Text style={styles.statLabel}>Músicas</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={styles.statArrow} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsRow}>
          {canEditScales && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/escala/nova")}>
              <View style={[styles.actionIcon, { backgroundColor: "#E6F4EA" }]}>
                <Ionicons name="calendar-number" size={24} color="#137333" />
              </View>
              <Text style={styles.actionText}>Nova Escala</Text>
            </TouchableOpacity>
          )}

          {canEditRepertoire && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/musica/nova")}>
              <View style={[styles.actionIcon, { backgroundColor: "#E8F0FE" }]}>
                <Ionicons name="add-circle" size={24} color="#1A73E8" />
              </View>
              <Text style={styles.actionText}>Nova Música</Text>
            </TouchableOpacity>
          )}

          {isLeader && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/convidar")}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEF7E0" }]}>
                <Ionicons name="person-add" size={24} color="#B06000" />
              </View>
              <Text style={styles.actionText}>Convidar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/avisos")}>
            <View style={[styles.actionIcon, { backgroundColor: "#FCE8E6" }]}>
              <Ionicons name="megaphone" size={24} color="#C5221F" />
            </View>
            <Text style={styles.actionText}>Ver Avisos</Text>
          </TouchableOpacity>
        </View>

        {/* Next Scale */}
        <Text style={styles.sectionTitle}>Próxima Escala</Text>
        {nextScale ? (
          <TouchableOpacity style={styles.scaleCard} onPress={() => router.push(`/escala/${nextScale.id}`)}>
            <View style={styles.scaleHeader}>
              <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{nextScale.date.split("-")[2] || "00"}</Text>
                <Text style={styles.dateMonth}>{formatDayName(nextScale.date)}</Text>
              </View>
              <View style={styles.scaleMeta}>
                <Text style={styles.scaleTitle}>{nextScale.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{nextScale.time || "Horário não definido"}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma escala agendada</Text>
          </View>
        )}

        {/* Announcements */}
        <Text style={styles.sectionTitle}>Últimos Avisos</Text>
        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <View key={ann.id} style={styles.annCard}>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annMessage} numberOfLines={2}>
                {ann.message}
              </Text>
              <Text style={styles.annAuthor}>
                Por {ann.author_name} • {formatDateBR(ann.created_at)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum aviso recente</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  welcome: { fontSize: 22, fontWeight: "600", color: colors.text },
  ministryName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  profileBtn: { padding: 4 },
  statsGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  statArrow: { position: "absolute", top: 12, right: 10 },
  statValue: { fontSize: 22, fontWeight: "600", color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
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
  scaleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  scaleHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateBlock: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
  },
  dateDay: { fontSize: 20, fontWeight: "700", color: colors.olive },
  dateMonth: { fontSize: 10, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", marginTop: 2 },
  scaleMeta: { flex: 1, gap: 4 },
  scaleTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: colors.textSecondary },
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
  annAuthor: { fontSize: 11, color: colors.textDisabled, marginTop: 8 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});