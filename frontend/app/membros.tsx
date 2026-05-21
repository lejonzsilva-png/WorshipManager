import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Member = { id: string; name: string; email: string; instruments: string[]; phone?: string | null; role: string; avatar_color: string };

export default function Membros() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Member[]>("/ministry/members").then(setMembers).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="membros-screen" edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Membros</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.olive} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item} testID={`member-${item.id}`}>
              <View style={[styles.avatar, { backgroundColor: item.avatar_color }]}><Text style={styles.avatarText}>{item.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.role === "leader" && <Ionicons name="star" size={12} color={colors.gold} />}
                </View>
                <Text style={styles.muted}>{item.email}</Text>
                {item.instruments.length > 0 && (
                  <View style={styles.chips}>
                    {item.instruments.map((i) => (
                      <View key={i} style={styles.chip}><Text style={styles.chipText}>{i}</Text></View>
                    ))}
                  </View>
                )}
              </View>
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
  list: { padding: spacing.lg, gap: 10 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: 18 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  muted: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  chip: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 10, color: colors.olive, fontWeight: "600" },
});
