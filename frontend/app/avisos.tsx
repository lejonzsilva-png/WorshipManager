import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth, usePermissions } from "@/src/context/AuthContext";
import { confirm } from "@/src/utils/confirm";
import { colors, radius, spacing } from "@/src/theme";

type Ann = { id: string; title: string; message: string; author_name: string; author_id: string; created_at: string };

export default function Avisos() {
  const router = useRouter();
  const { user } = useAuth();
  const { canEditAnnouncements } = usePermissions();
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setItems(await api<Ann[]>("/announcements")); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (id: string) =>
    confirm({
      title: "Excluir aviso?",
      confirmText: "Excluir",
      destructive: true,
      onConfirm: async () => {
        await api(`/announcements/${id}`, { method: "DELETE" });
        load();
      },
    });

  return (
    <SafeAreaView style={styles.container} testID="avisos-screen" edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Avisos</Text>
        {canEditAnnouncements ? (
          <TouchableOpacity onPress={() => router.push("/aviso/novo")} testID="new-announcement-btn"><Ionicons name="add" size={26} color={colors.olive} /></TouchableOpacity>
        ) : <View style={{ width: 26 }} />}
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.olive} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyText}>Nenhum aviso ainda</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.item} testID={`ann-${item.id}`}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {(item.author_id === user?.id || canEditAnnouncements) && (
                  <TouchableOpacity onPress={() => onDelete(item.id)}><Ionicons name="trash-outline" size={18} color={colors.textDisabled} /></TouchableOpacity>
                )}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.author}>— {item.author_name}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  list: { padding: spacing.lg, gap: 12 },
  item: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  message: { fontSize: 14, color: colors.text, marginTop: 6, lineHeight: 20 },
  author: { fontSize: 11, color: colors.textDisabled, marginTop: 8, fontStyle: "italic" },
  empty: { alignItems: "center", padding: spacing.xl, marginTop: 80, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
