import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { api } from "@/src/api/client";
import { confirm } from "@/src/utils/confirm";
import { colors, radius, spacing } from "@/src/theme";

type Hook = { id: string; url: string; events: string[]; secret: string; active: boolean; description?: string };

const AVAILABLE_EVENTS = ["scale.created", "scale.updated", "scale.deleted"];

export default function Webhooks() {
  const router = useRouter();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [events, setEvents] = useState<string[]>([...AVAILABLE_EVENTS]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const h = await api<Hook[]>("/webhooks");
      setHooks(h || []);
    } catch (e: any) {
      alert(e?.message || "Falha ao carregar webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleEvent = (ev: string) =>
    setEvents((p) => (p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]));

  const submit = async () => {
    if (!url.startsWith("http")) {
      alert("URL inválida (deve começar com http/https)");
      return;
    }
    if (events.length === 0) {
      alert("Selecione ao menos um evento");
      return;
    }
    setSaving(true);
    try {
      await api("/webhooks", { method: "POST", body: { url, events, description: desc } });
      setShowForm(false);
      setUrl("");
      setDesc("");
      setEvents([...AVAILABLE_EVENTS]);
      await load();
    } catch (e: any) {
      alert(e?.message || "Falha ao criar webhook");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) =>
    confirm({
      title: "Excluir webhook?",
      destructive: true,
      confirmText: "Excluir",
      onConfirm: async () => {
        await api(`/webhooks/${id}`, { method: "DELETE" });
        await load();
      },
    });

  const test = async (id: string) => {
    try {
      const r = await api<{ status_code: number }>(`/webhooks/${id}/test`, { method: "POST" });
      alert(`Webhook chamado. Status HTTP: ${r.status_code}`);
    } catch (e: any) {
      alert(e?.message || "Falha ao testar webhook");
    }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    alert("Copiado!");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.olive} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="webhooks-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Webhooks</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} testID="toggle-form">
          <Ionicons name={showForm ? "close" : "add"} size={26} color={colors.olive} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Receba notificações em tempo real quando escalas são criadas, atualizadas ou excluídas. Útil para sincronizar com apps externos (ex: metrônomo).
        </Text>

        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>NOVO WEBHOOK</Text>
            <Text style={styles.label}>URL de destino</Text>
            <TextInput
              testID="hook-url"
              style={styles.input}
              placeholder="https://meu-servidor.com/webhook"
              placeholderTextColor={colors.textDisabled}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              testID="hook-desc"
              style={styles.input}
              placeholder="Ex: Sync metrônomo principal"
              placeholderTextColor={colors.textDisabled}
              value={desc}
              onChangeText={setDesc}
            />
            <Text style={styles.label}>Eventos</Text>
            <View style={styles.chipsWrap}>
              {AVAILABLE_EVENTS.map((ev) => {
                const on = events.includes(ev);
                return (
                  <TouchableOpacity
                    key={ev}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleEvent(ev)}
                    testID={`ev-${ev}`}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{ev}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.submit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Criar webhook</Text>}
            </TouchableOpacity>
          </View>
        )}

        {hooks.length === 0 ? (
          <Text style={styles.muted}>Nenhum webhook cadastrado.</Text>
        ) : (
          hooks.map((h) => (
            <View key={h.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.hookUrl} numberOfLines={1} ellipsizeMode="middle">{h.url}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => test(h.id)} testID={`test-${h.id}`} style={styles.iconBtn}>
                    <Ionicons name="send" size={18} color={colors.info} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(h.id)} testID={`del-${h.id}`} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              {h.description ? <Text style={styles.muted}>{h.description}</Text> : null}
              <View style={styles.chipsWrap}>
                {h.events.map((ev) => (
                  <View key={ev} style={[styles.chip, styles.chipOn]}>
                    <Text style={[styles.chipText, styles.chipTextOn]}>{ev}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.secretBox} onPress={() => copy(h.secret)} testID={`copy-secret-${h.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.secretLabel}>SEGREDO (X-Louvor-Secret)</Text>
                  <Text style={styles.secretText} numberOfLines={1} ellipsizeMode="middle">{h.secret}</Text>
                </View>
                <Ionicons name="copy-outline" size={18} color={colors.olive} />
              </TouchableOpacity>
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
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg },
  intro: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1.2, fontWeight: "600", marginBottom: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hookUrl: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  actions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.olive, borderColor: colors.olive },
  chipText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  submit: { backgroundColor: colors.olive, paddingVertical: 14, borderRadius: radius.full, marginTop: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secretBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceElevated, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, marginTop: 10 },
  secretLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600" },
  secretText: { fontFamily: "monospace", fontSize: 11, color: colors.text, marginTop: 2 },
  muted: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
});
