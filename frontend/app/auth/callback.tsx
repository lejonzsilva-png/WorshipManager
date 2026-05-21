import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api, setToken } from "@/src/api/client";
import { useAuth } from "@/src/context/AuthContext";
import { colors, spacing, radius } from "@/src/theme";

export default function AuthCallback() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Extract session_id from URL hash (web) or fragment (native deep link)
        let session_id: string | null = null;
        if (typeof window !== "undefined") {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const qs = new URLSearchParams(window.location.search);
          session_id = hash.get("session_id") || qs.get("session_id");
        }
        if (!session_id) {
          setError("Sessão não encontrada na URL");
          return;
        }
        const res = await api<{ token: string }>("/auth/google", {
          method: "POST",
          body: { session_id },
          auth: false,
        });
        await setToken(res.token);
        await refresh();
        router.replace("/(tabs)");
      } catch (e: any) {
        setError(e?.message || "Falha ao concluir login");
      }
    })();
  }, []);

  return (
    <View style={styles.c}>
      <ActivityIndicator color={colors.olive} />
      <Text style={styles.t}>{error || "Conectando com Google..."}</Text>
      {error ? (
        <Text style={styles.b} onPress={() => router.replace("/login")}>Voltar para login</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: 12, backgroundColor: colors.bg },
  t: { color: colors.textSecondary, fontSize: 14 },
  b: { color: colors.olive, fontWeight: "600", marginTop: 12, padding: 8, borderRadius: radius.md },
});
