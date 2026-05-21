import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { usePermissions } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

type Song = {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  bpm?: number;
};

export default function Repertorio() {
  const router = useRouter();
  const { canEditSongs } = usePermissions();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<Song[]>("/songs");
      setSongs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.artist || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} testID="repertorio-screen" edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Repertório</Text>
        {canEditSongs ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/musica/nova")}
            testID="new-song-btn"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          testID="song-search"
          style={styles.search}
          placeholder="Buscar música ou artista..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.emptyText}>
                {search ? "Nenhuma música encontrada" : "Sem músicas ainda"}
              </Text>
              {!search && canEditSongs && (
                <TouchableOpacity onPress={() => router.push("/musica/nova")} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Adicionar música</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/musica/${item.id}`)}
              testID={`song-item-${item.id}`}
            >
              <View style={styles.iconBox}>
                <Ionicons name="musical-note" size={20} color={colors.terracotta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{item.title}</Text>
                {item.artist ? <Text style={styles.songArtist}>{item.artist}</Text> : null}
              </View>
              {item.key ? (
                <View style={styles.keyBadge}>
                  <Text style={styles.keyText}>{item.key}</Text>
                </View>
              ) : null}
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
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  search: { flex: 1, color: colors.text, fontSize: 14 },
  list: { padding: spacing.lg, paddingTop: 0, gap: 8 },
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
  iconBox: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  songTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  songArtist: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  keyBadge: {
    backgroundColor: colors.olive, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, minWidth: 36, alignItems: "center",
  },
  keyText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { alignItems: "center", padding: spacing.xl, gap: 12, marginTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  btnPrimary: {
    backgroundColor: colors.olive, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: radius.full, marginTop: 8,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
});
