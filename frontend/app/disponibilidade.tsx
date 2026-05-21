import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { confirm } from "@/src/utils/confirm";
import { colors, radius, spacing, formatDateBR, formatDayName } from "@/src/theme";

type Entry = { id: string; date: string; status: "available" | "unavailable"; note?: string; user_name: string; user_id: string };

export default function Disponibilidade() {
  const router = useRouter();
  const [mine, setMine] = useState<Entry[]>([]);
  const [byDate, setByDate] = useState<Record<string, Entry[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"available" | "unavailable">("available");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, g] = await Promise.all([
        api<Entry[]>("/availability/me"),
        api<{ by_date: Record<string, Entry[]> }>("/availability/ministry"),
      ]);
      setMine(m || []);
      setByDate(g?.by_date || {});
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  const submit = async () => {
    if (!validDate(date)) {
      alert("Use o formato YYYY-MM-DD (ex: 2026-03-15)");
      return;
    }
    setSaving(true);
    try {
      await api("/availability", { method: "POST", body: { date, status, note } });
      setShowForm(false);
      setNote("");
      setDate("");
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) =>
    confirm({
      title: "Excluir registro?",
      destructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        await api(`/availability/${id}`, { method: "DELETE" });
        await load();
      },
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.olive} />
      </SafeAreaView>
    );
  }

  const dates = Object.keys(byDate).sort();

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="disponibilidade-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Disponibilidade</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} testID="toggle-form">
          <Ionicons name={showForm ? "close" : "add"} size={26} color={colors.olive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NOVA DISPONIBILIDADE</Text>
            <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
            <TextInput
              testID="av-date"
              style={styles.input}
              placeholder="2026-03-15"
              placeholderTextColor={colors.textDisabled}
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.statusBtn, status === "available" && styles.statusBtnOn]}
                onPress={() => setStatus("available")}
                testID="av-available"
              >
                <Ionicons name="checkmark-circle" size={18} color={status === "available" ? "#fff" : colors.success} />
                <Text style={[styles.statusText, status === "available" && styles.statusTextOn]}>Disponível</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, status === "unavailable" && styles.statusBtnOff]}
                onPress={() => setStatus("unavailable")}
                testID="av-unavailable"
              >
                <Ionicons name="close-circle" size={18} color={status === "unavailable" ? "#fff" : colors.error} />
                <Text style={[styles.statusText, status === "unavailable" && styles.statusTextOn]}>Indisponível</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Observação (opcional)</Text>
            <TextInput
              testID="av-note"
              style={[styles.input, { minHeight: 56 }]}
              placeholder="Ex: estarei viajando, etc."
              placeholderTextColor={colors.textDisabled}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <TouchableOpacity
              style={[styles.submit, saving && { opacity: 0.6 }]}
              onPress={submit}
              disabled={saving}
              testID="av-submit"
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.section}>MINHAS PRÓXIMAS</Text>
        {mine.length === 0 ? (
          <Text style={styles.muted}>Você ainda não registrou disponibilidade.</Text>
        ) : (
          mine.map((m) => (
            <View key={m.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDate}>{formatDayName(m.date)} • {formatDateBR(m.date)}</Text>
                {m.note ? <Text style={styles.muted}>{m.note}</Text> : null}
              </View>
              <View style={[styles.pill, m.status === "available" ? styles.pillOk : styles.pillNo]}>
                <Text style={styles.pillText}>{m.status === "available" ? "Disponível" : "Indisponível"}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(m.id)} testID={`del-${m.id}`} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.section}>VISÃO DO MINISTÉRIO</Text>
        {dates.length === 0 ? (
          <Text style={styles.muted}>Sem registros futuros do ministério.</Text>
        ) : (
          dates.map((d) => {
            const list = byDate[d] || [];
            const avail = list.filter((x) => x.status === "available");
            const unavail = list.filter((x) => x.status === "unavailable");
            return (
              <View key={d} style={styles.card}>
                <Text style={styles.dayHeader}>{formatDayName(d)} • {formatDateBR(d)}</Text>
                {avail.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.subLabel}>✅ Disponíveis ({avail.length})</Text>
                    <Text style={styles.names}>{avail.map((a) => a.user_name).join(", ")}</Text>
                  </View>
                )}
                {unavail.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.subLabel}>❌ Indisponíveis ({unavail.length})</Text>
                    <Text style={styles.names}>{unavail.map((a) => a.user_name).join(", ")}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12, justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1.2, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  row: { flexDirection: "row", gap: 8 },
  statusBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  statusBtnOn: { backgroundColor: colors.success, borderColor: colors.success },
  statusBtnOff: { backgroundColor: colors.error, borderColor: colors.error },
  statusText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  statusTextOn: { color: "#fff" },
  submit: { backgroundColor: colors.olive, paddingVertical: 14, borderRadius: radius.full, marginTop: 14, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  section: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1.2, fontWeight: "600", marginTop: 12, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  itemDate: { fontSize: 14, color: colors.text, fontWeight: "500" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillOk: { backgroundColor: colors.success },
  pillNo: { backgroundColor: colors.error },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dayHeader: { fontSize: 14, fontWeight: "600", color: colors.text },
  subLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  names: { fontSize: 13, color: colors.text },
  muted: { color: colors.textSecondary, fontSize: 13 },
});
