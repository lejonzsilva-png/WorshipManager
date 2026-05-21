import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

type Member = { id: string; name: string; instruments: string[]; avatar_color: string };
type Song = { id: string; title: string; artist?: string; key?: string };
type ScaleData = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  song_ids: string[];
  assignments: { user_id: string; user_name: string; instrument: string }[];
};

export default function NovaEscala() {
  const router = useRouter();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!editId;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:30");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<{ user_id: string; user_name: string; instrument: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [songSearch, setSongSearch] = useState("");

  const moveSong = (idx: number, dir: -1 | 1) => {
    setSelectedSongs((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeSong = (sid: string) =>
    setSelectedSongs((prev) => prev.filter((x) => x !== sid));

  const addSong = (sid: string) => {
    setSelectedSongs((prev) => (prev.includes(sid) ? prev : [...prev, sid]));
    setSongPickerOpen(false);
    setSongSearch("");
  };

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api<Member[]>("/ministry/members"),
          api<Song[]>("/songs"),
        ]);
        setMembers(m);
        setSongs(s);
        if (isEdit && editId) {
          const sc = await api<ScaleData>(`/scales/${editId}`);
          setTitle(sc.title);
          setDate(sc.date);
          setTime(sc.time || "19:30");
          setLocation(sc.location || "");
          setNotes(sc.notes || "");
          setSelectedSongs(sc.song_ids || []);
          setAssignments(sc.assignments || []);
        }
      } catch {} finally {
        setInitialLoading(false);
      }
    })();
  }, [isEdit, editId]);

  const toggleSong = (id: string) =>
    setSelectedSongs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const songById = (sid: string) => songs.find((s) => s.id === sid);
  const availableSongs = songs
    .filter((s) => !selectedSongs.includes(s.id))
    .filter((s) => {
      const q = songSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q)
      );
    });

  const toggleMember = (m: Member) => {
    const idx = assignments.findIndex((a) => a.user_id === m.id);
    if (idx >= 0) setAssignments((p) => p.filter((a) => a.user_id !== m.id));
    else setAssignments((p) => [...p, { user_id: m.id, user_name: m.name, instrument: m.instruments[0] || "Vocal" }]);
  };

  const onSave = async () => {
    if (!title.trim() || !date) {
      Alert.alert("Atenção", "Informe título e data");
      return;
    }
    setSaving(true);
    try {
      const body = { title, date, time, location, notes, song_ids: selectedSongs, assignments };
      if (isEdit && editId) {
        await api(`/scales/${editId}`, { method: "PUT", body });
      } else {
        await api("/scales", { method: "POST", body });
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="nova-escala-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Editar Escala" : "Nova Escala"}</Text>
        <TouchableOpacity onPress={onSave} disabled={saving || initialLoading} testID="save-scale">
          {saving ? <ActivityIndicator color={colors.olive} /> : <Text style={styles.saveText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.olive} />
        </View>
      ) : (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Título *</Text>
          <TextInput style={styles.input} placeholder="Culto Domingo Manhã" placeholderTextColor={colors.textDisabled}
            value={title} onChangeText={setTitle} testID="scale-title" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Data * (AAAA-MM-DD)</Text>
              <TextInput style={styles.input} placeholder="2026-03-15" placeholderTextColor={colors.textDisabled}
                value={date} onChangeText={setDate} testID="scale-date" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Horário</Text>
              <TextInput style={styles.input} placeholder="19:30" placeholderTextColor={colors.textDisabled}
                value={time} onChangeText={setTime} testID="scale-time" />
            </View>
          </View>

          <Text style={styles.label}>Local</Text>
          <TextInput style={styles.input} placeholder="Templo Sede" placeholderTextColor={colors.textDisabled}
            value={location} onChangeText={setLocation} testID="scale-location" />

          <Text style={styles.label}>Observações</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} multiline
            placeholder="Anotações sobre o culto..." placeholderTextColor={colors.textDisabled}
            value={notes} onChangeText={setNotes} testID="scale-notes" />

          <Text style={styles.section}>MÚSICOS ({assignments.length})</Text>
          {members.length === 0 ? (
            <Text style={styles.muted}>Nenhum membro no ministério ainda</Text>
          ) : (
            members.map((m) => {
              const a = assignments.find((x) => x.user_id === m.id);
              return (
                <TouchableOpacity key={m.id} style={[styles.memberRow, a && styles.memberActive]} onPress={() => toggleMember(m)} testID={`assign-${m.id}`}>
                  <View style={[styles.miniAvatar, { backgroundColor: m.avatar_color }]}>
                    <Text style={styles.miniAvatarText}>{m.name[0]}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.name}</Text>
                  {a ? <Text style={styles.instr}>{a.instrument}</Text> : null}
                  <Ionicons name={a ? "checkmark-circle" : "ellipse-outline"} size={22} color={a ? colors.olive : colors.textDisabled} />
                </TouchableOpacity>
              );
            })
          )}

          <Text style={styles.section}>REPERTÓRIO ({selectedSongs.length})</Text>
          {selectedSongs.length === 0 ? (
            <Text style={styles.muted}>Nenhuma música adicionada. Toque em + para começar.</Text>
          ) : (
            selectedSongs.map((sid, idx) => {
              const s = songById(sid);
              if (!s) return null;
              return (
                <View key={sid} style={styles.setlistRow} testID={`setlist-${sid}`}>
                  <View style={styles.orderBadge}><Text style={styles.orderText}>{idx + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{s.title}</Text>
                    {s.artist ? <Text style={styles.muted}>{s.artist}</Text> : null}
                  </View>
                  {s.key ? <View style={styles.keyBadge}><Text style={styles.keyText}>{s.key}</Text></View> : null}
                  <TouchableOpacity onPress={() => moveSong(idx, -1)} disabled={idx === 0} style={styles.reorderBtn} testID={`up-${sid}`}>
                    <Ionicons name="chevron-up" size={18} color={idx === 0 ? colors.textDisabled : colors.olive} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSong(idx, 1)} disabled={idx === selectedSongs.length - 1} style={styles.reorderBtn} testID={`down-${sid}`}>
                    <Ionicons name="chevron-down" size={18} color={idx === selectedSongs.length - 1 ? colors.textDisabled : colors.olive} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSong(sid)} style={styles.reorderBtn} testID={`remove-song-${sid}`}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={styles.addSongBtn}
            onPress={() => setSongPickerOpen(true)}
            testID="add-song-btn"
          >
            <Ionicons name="add-circle" size={22} color={colors.olive} />
            <Text style={styles.addSongText}>
              {selectedSongs.length === 0 ? "Adicionar primeira música" : "Adicionar música"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      )}

      <Modal
        visible={songPickerOpen}
        animationType="slide"
        onRequestClose={() => setSongPickerOpen(false)}
        transparent={false}
      >
        <SafeAreaView style={styles.container} testID="song-picker-modal">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => { setSongPickerOpen(false); setSongSearch(""); }} testID="close-picker">
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Escolher música</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por título ou artista..."
              placeholderTextColor={colors.textDisabled}
              value={songSearch}
              onChangeText={setSongSearch}
              autoFocus
              testID="picker-search"
            />
          </View>

          {songs.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="musical-notes-outline" size={40} color={colors.textDisabled} />
              <Text style={styles.muted}>Nenhuma música no repertório do ministério.</Text>
              <Text style={styles.muted}>Cadastre músicas na aba Repertório primeiro.</Text>
            </View>
          ) : availableSongs.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="checkmark-done" size={40} color={colors.textDisabled} />
              <Text style={styles.muted}>
                {songSearch ? "Nenhuma música encontrada" : "Todas as músicas já foram adicionadas"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableSongs}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ padding: spacing.lg, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => addSong(item.id)}
                  testID={`pick-${item.id}`}
                >
                  <Ionicons name="musical-note" size={20} color={colors.terracotta} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.title}</Text>
                    {item.artist ? <Text style={styles.muted}>{item.artist}</Text> : null}
                  </View>
                  {item.key ? <View style={styles.keyBadge}><Text style={styles.keyText}>{item.key}</Text></View> : null}
                  <Ionicons name="add-circle" size={24} color={colors.olive} />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveText: { color: colors.olive, fontWeight: "600", fontSize: 15 },
  content: { padding: spacing.lg, gap: 4 },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 12, marginBottom: 6, fontWeight: "500" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  section: { fontSize: 12, color: colors.textSecondary, letterSpacing: 1, fontWeight: "600", marginTop: 24, marginBottom: 10 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  memberActive: { borderColor: colors.olive, backgroundColor: "#F4F1E8" },
  songRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  setlistRow: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 10,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  orderBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.olive,
    alignItems: "center", justifyContent: "center",
  },
  orderText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  reorderBtn: { padding: 4 },
  addSongBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, marginTop: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.olive,
  },
  addSongText: { color: colors.olive, fontWeight: "600", fontSize: 14 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 10,
    marginVertical: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  pickerEmpty: { alignItems: "center", padding: spacing.xl, gap: 8, marginTop: 60 },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  miniAvatarText: { color: "#fff", fontWeight: "600" },
  memberName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500" },
  instr: { fontSize: 11, color: colors.olive, fontWeight: "600" },
  muted: { color: colors.textSecondary, fontSize: 13 },
  keyBadge: { backgroundColor: colors.olive, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  keyText: { color: "#fff", fontWeight: "700", fontSize: 11 },
});
