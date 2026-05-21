import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function NovaMusica() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [cifraUrl, setCifraUrl] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert("Atenção", "Informe o título");
      return;
    }
    setSaving(true);
    try {
      await api("/songs", {
        method: "POST",
        body: { title, artist, key, bpm: bpm ? parseInt(bpm) : null, youtube_url: youtubeUrl, cifra_url: cifraUrl, lyrics },
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="nova-musica">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Música</Text>
        <TouchableOpacity onPress={onSave} disabled={saving} testID="save-song">
          {saving ? <ActivityIndicator color={colors.olive} /> : <Text style={styles.saveText}>Salvar</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Título *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Reckless Love" placeholderTextColor={colors.textDisabled} testID="song-title" />

          <Text style={styles.label}>Artista</Text>
          <TextInput style={styles.input} value={artist} onChangeText={setArtist} placeholder="Cory Asbury" placeholderTextColor={colors.textDisabled} testID="song-artist" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tom</Text>
              <TextInput style={styles.input} value={key} onChangeText={setKey} placeholder="G" placeholderTextColor={colors.textDisabled} testID="song-key" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>BPM</Text>
              <TextInput style={styles.input} value={bpm} onChangeText={setBpm} placeholder="68" placeholderTextColor={colors.textDisabled} keyboardType="numeric" testID="song-bpm" />
            </View>
          </View>

          <Text style={styles.label}>Link YouTube</Text>
          <TextInput style={styles.input} value={youtubeUrl} onChangeText={setYoutubeUrl} placeholder="https://youtube.com/..." placeholderTextColor={colors.textDisabled} autoCapitalize="none" />

          <Text style={styles.label}>Link Cifra</Text>
          <TextInput style={styles.input} value={cifraUrl} onChangeText={setCifraUrl} placeholder="https://cifraclub.com/..." placeholderTextColor={colors.textDisabled} autoCapitalize="none" />

          <Text style={styles.label}>Letra / Cifra</Text>
          <TextInput style={[styles.input, { minHeight: 200, textAlignVertical: "top", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]}
            multiline value={lyrics} onChangeText={setLyrics} placeholder="Cole aqui a letra ou cifra..." placeholderTextColor={colors.textDisabled} testID="song-lyrics" />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveText: { color: colors.olive, fontWeight: "600", fontSize: 15 },
  content: { padding: spacing.lg },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 12, marginBottom: 6, fontWeight: "500" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
});
