import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function NovoAviso() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Atenção", "Preencha título e mensagem");
      return;
    }
    setSaving(true);
    try {
      await api("/announcements", { method: "POST", body: { title, message } });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="novo-aviso">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Aviso</Text>
        <TouchableOpacity onPress={onSave} disabled={saving} testID="save-announcement">
          {saving ? <ActivityIndicator color={colors.olive} /> : <Text style={styles.saveText}>Publicar</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ensaio extra na quarta" placeholderTextColor={colors.textDisabled} testID="ann-title" />
          <Text style={styles.label}>Mensagem</Text>
          <TextInput style={[styles.input, { minHeight: 160, textAlignVertical: "top" }]}
            multiline value={message} onChangeText={setMessage} placeholder="Compartilhe o aviso com o ministério..." placeholderTextColor={colors.textDisabled} testID="ann-message" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveText: { color: colors.olive, fontWeight: "600", fontSize: 15 },
  content: { padding: spacing.lg },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 8, marginBottom: 6, fontWeight: "500" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
});
