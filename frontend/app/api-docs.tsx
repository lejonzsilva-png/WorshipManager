import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radius, spacing } from "@/src/theme";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "https://seu-app.com";

export default function ApiDocs() {
  const router = useRouter();
  const { ministry } = useAuth();
  const apiKey = ministry?.api_key || "SUA_CHAVE_AQUI";

  const copy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copiado", `${label} copiado!`);
  };

  const endpoints = useMemo(
    () => [
      {
        method: "GET",
        path: "/api/external/ministry",
        desc: "Retorna informações básicas do ministério.",
        example: `{
  "id": "abc-123",
  "name": "Ministério Demo"
}`,
      },
      {
        method: "GET",
        path: "/api/external/songs",
        desc: "Lista TODAS as músicas do repertório, com tom e BPM (ideal para sync inicial).",
        example: `{
  "ministry_id": "abc-123",
  "count": 2,
  "songs": [
    {
      "id": "s1",
      "title": "Reckless Love",
      "artist": "Cory Asbury",
      "key": "G",
      "bpm": 68,
      "youtube_url": "...",
      "cifra_url": "...",
      "tags": []
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/external/scales?upcoming=true&limit=50",
        desc: "Lista escalas (eventos) com setlist já hidratado — cada música vem com BPM. Use upcoming=false para incluir passadas.",
        example: `{
  "ministry_id": "abc-123",
  "count": 1,
  "scales": [
    {
      "id": "sc-1",
      "title": "Culto Domingo Manhã",
      "date": "2026-03-15",
      "time": "19:30",
      "location": "Templo Sede",
      "notes": "Tema: graça",
      "songs": [
        { "id": "s1", "title": "Reckless Love", "key": "G", "bpm": 68 }
      ],
      "musicians": [
        { "user_id": "u1", "user_name": "Ana", "instrument": "Vocal" }
      ]
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/external/scales/{scale_id}",
        desc: "Detalhe de uma escala específica, com setlist em ordem (preserva a ordem de execução para o metrônomo).",
        example: `{
  "id": "sc-1",
  "title": "Culto Domingo Manhã",
  "date": "2026-03-15",
  "time": "19:30",
  "songs": [
    { "id": "s1", "title": "Música 1", "bpm": 72 },
    { "id": "s2", "title": "Música 2", "bpm": 84 }
  ]
}`,
      },
    ],
    []
  );

  const curlExample = `curl -H "X-API-Key: ${apiKey}" \\
  ${BASE}/api/external/scales?upcoming=true`;

  const jsExample = `// JavaScript / fetch
const res = await fetch(
  "${BASE}/api/external/scales?upcoming=true",
  { headers: { "X-API-Key": "${apiKey}" } }
);
const data = await res.json();
// data.scales[0].songs.forEach(s => metronome.setBPM(s.bpm));`;

  return (
    <SafeAreaView style={styles.container} testID="api-docs-screen" edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Externa</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="code-slash" size={28} color={colors.gold} />
          <Text style={styles.heroTitle}>Sincronize com seu metrônomo</Text>
          <Text style={styles.heroDesc}>
            Conecte qualquer app externo ao seu ministério via REST/JSON. Todos os endpoints autenticam
            com o header <Text style={styles.code}>X-API-Key</Text>.
          </Text>
        </View>

        <Text style={styles.section}>BASE URL</Text>
        <TouchableOpacity style={styles.codeBox} onPress={() => copy(BASE, "Base URL")} testID="copy-base">
          <Text style={styles.codeText}>{BASE}</Text>
          <Ionicons name="copy-outline" size={16} color={colors.olive} />
        </TouchableOpacity>

        <Text style={styles.section}>AUTENTICAÇÃO</Text>
        <Text style={styles.muted}>
          Envie sua chave em todas as requisições no header HTTP <Text style={styles.code}>X-API-Key</Text>.
        </Text>
        <TouchableOpacity style={styles.codeBox} onPress={() => copy(apiKey, "API Key")} testID="copy-key-docs">
          <Text style={styles.codeText} numberOfLines={1} ellipsizeMode="middle">
            X-API-Key: {apiKey}
          </Text>
          <Ionicons name="copy-outline" size={16} color={colors.olive} />
        </TouchableOpacity>

        <Text style={styles.section}>ENDPOINTS</Text>
        {endpoints.map((e) => (
          <View key={e.path} style={styles.endpointCard}>
            <View style={styles.endpointHeader}>
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>{e.method}</Text>
              </View>
              <Text style={styles.endpointPath} numberOfLines={1} ellipsizeMode="tail">{e.path}</Text>
            </View>
            <Text style={styles.endpointDesc}>{e.desc}</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleLabel}>RESPOSTA JSON</Text>
              <Text style={styles.exampleCode}>{e.example}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.section}>EXEMPLO: cURL</Text>
        <TouchableOpacity style={styles.snippetBox} onPress={() => copy(curlExample, "Comando curl")} testID="copy-curl">
          <Text style={styles.exampleCode}>{curlExample}</Text>
          <View style={styles.snippetCopy}>
            <Ionicons name="copy-outline" size={14} color={colors.olive} />
            <Text style={styles.snippetCopyText}>Copiar</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.section}>EXEMPLO: JavaScript</Text>
        <TouchableOpacity style={styles.snippetBox} onPress={() => copy(jsExample, "Snippet JS")} testID="copy-js">
          <Text style={styles.exampleCode}>{jsExample}</Text>
          <View style={styles.snippetCopy}>
            <Ionicons name="copy-outline" size={14} color={colors.olive} />
            <Text style={styles.snippetCopyText}>Copiar</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={colors.warning} />
          <Text style={styles.tipText}>
            Trate sua chave como uma senha. Se vazar, use o botão <Text style={styles.code}>Rotacionar</Text> no
            Perfil para invalidá-la imediatamente.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const mono = Platform.OS === "ios" ? "Courier" : "monospace";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  content: { padding: spacing.lg },
  heroCard: {
    backgroundColor: colors.olive,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 8,
    marginBottom: spacing.md,
  },
  heroTitle: { color: "#fff", fontSize: 20, fontWeight: "600" },
  heroDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 20 },
  section: {
    fontSize: 11, letterSpacing: 1.2, fontWeight: "700",
    color: colors.textSecondary, marginTop: spacing.lg, marginBottom: 8,
  },
  muted: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  code: { fontFamily: mono, backgroundColor: colors.surfaceElevated, color: colors.olive, paddingHorizontal: 4, borderRadius: 4 },
  codeBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  codeText: { flex: 1, fontFamily: mono, fontSize: 12, color: colors.text },
  endpointCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: 10,
  },
  endpointHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  methodBadge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  methodText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  endpointPath: { flex: 1, fontFamily: mono, fontSize: 12, color: colors.text, fontWeight: "600" },
  endpointDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  exampleBox: { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 10 },
  exampleLabel: { fontSize: 9, color: colors.textSecondary, letterSpacing: 1, fontWeight: "700", marginBottom: 4 },
  exampleCode: { fontFamily: mono, fontSize: 11, color: colors.text, lineHeight: 16 },
  snippetBox: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  snippetCopy: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, alignSelf: "flex-end" },
  snippetCopyText: { fontSize: 11, color: colors.olive, fontWeight: "600" },
  tipCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#FFF8EC", borderRadius: radius.md,
    padding: 12, marginTop: spacing.lg, borderWidth: 1, borderColor: "#F0DDB0",
  },
  tipText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 18 },
});
