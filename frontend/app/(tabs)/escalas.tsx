import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { usePermissions } from "@/src/context/AuthContext";
import { colors, radius, spacing, formatDateBR, formatDayName } from "@/src/theme";

type Scale = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  assignments: { user_id: string; user_name: string; instrument: string }[];
  song_ids: string[];
};

export default function Escalas() {
  const router = useRouter();
  const { canEditScales } = usePermissions();
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  const load = useCallback(async () => {
    try {
      const data = await api<Scale[]>("/scales");
      setScales(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = new Date().toISOString().split("T")[0];
  const filtered = scales.filter((s) => (filter === "upcoming" ? s.date >= today : s.date < today));

  return (
    <SafeAreaView style={styles.container} testID="escalas-screen" edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Escalas</Text>
        {canEditScales ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/escala/nova")}
            testID="new-scale-btn"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segItem, filter === "upcoming" && styles.segActive]}
          onPress={() => setFilter("upcoming")}
          testID="filter-upcoming"
        >
          <Text style={[styles.segText, filter === "upcoming" && styles.segTextActive]}>Próximas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segItem, filter === "past" && styles.segActive]}
          onPress={() => setFilter("past")}
          testID="filter-past"
        >
          <Text style={[styles.segText, filter === "past" && styles.segTextActive]}>Anteriores</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.olive} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyText}>
                {filter === "upcoming" ? "Nenhuma escala futura" : "Sem escalas anteriores"}
              </Text>
              {filter === "upcoming" && canEditScales && (
                <TouchableOpacity onPress={() => router.push("/escala/nova")} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Criar escala</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/escala/${item.id}`)}
              testID={`scale-item-${item.id}`}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{item.date.split("-")[2]}</Text>
                <Text style={styles.dateMonth}>{formatDayName(item.date).slice(0, 3)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {formatDateBR(item.date)} • {item.time || "—"}
                </Text>
                {item.location ? <Text style={styles.itemLocation}>📍 {item.location}</Text> : null}
                <View style={styles.itemFooter}>
                  <View style={styles.chip}>
                    <Ionicons name="people-outline" size={12} color={colors.olive} />
                    <Text style={styles.chipText}>{item.assignments.length}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Ionicons name="musical-notes-outline" size={12} color={colors.olive} />
                    <Text style={styles.chipText}>{item.song_ids.length}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 28, fontWeight: "600", color: colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.olive,
    alignItems: "center", justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    padding: 4,
    borderRadius: radius.full,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  segItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.full },
  segActive: { backgroundColor: colors.surface },
  segText: { color: colors.textSecondary, fontWeight: "500", fontSize: 13 },
  segTextActive: { color: colors.olive, fontWeight: "600" },
  list: { padding: spacing.lg, paddingTop: 0, gap: 12 },
  item: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 12,
  },
  dateBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  dateDay: { fontSize: 20, fontWeight: "600", color: colors.olive },
  dateMonth: { fontSize: 10, color: colors.textSecondary, textTransform: "uppercase", marginTop: -2 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  itemLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemFooter: { flexDirection: "row", gap: 8, marginTop: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  chipText: { fontSize: 11, color: colors.olive, fontWeight: "600" },
  empty: { alignItems: "center", padding: spacing.xl, gap: 12, marginTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  btnPrimary: {
    backgroundColor: colors.olive, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: radius.full, marginTop: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
});
