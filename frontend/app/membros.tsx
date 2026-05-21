import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth, usePermissions, PERMS } from "@/src/context/AuthContext";
import { confirm } from "@/src/utils/confirm";
import { colors, radius, spacing } from "@/src/theme";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "leader" | "member";
  instruments: string[];
  permissions: string[];
  phone?: string | null;
  avatar_color: string;
};

const PERM_LABELS: { key: string; label: string; icon: any }[] = [
  { key: PERMS.EDIT_SCALES, label: "Editar escalas", icon: "calendar" },
  { key: PERMS.EDIT_SONGS, label: "Editar repertório", icon: "musical-notes" },
  { key: PERMS.EDIT_ANNOUNCEMENTS, label: "Editar avisos", icon: "megaphone" },
];

export default function Membros() {
  const router = useRouter();
  const { user } = useAuth();
  const { isLeader } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Member | null>(null);
  const [draftRole, setDraftRole] = useState<"leader" | "member">("member");
  const [draftPerms, setDraftPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<Member[]>("/ministry/members");
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openManage = (m: Member) => {
    setSelected(m);
    setDraftRole(m.role);
    setDraftPerms(m.role === "leader" ? [PERMS.EDIT_SCALES, PERMS.EDIT_SONGS, PERMS.EDIT_ANNOUNCEMENTS] : m.permissions || []);
  };

  const togglePerm = (p: string) => {
    setDraftPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const saveChanges = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: any = { role: draftRole };
      if (draftRole === "member") body.permissions = draftPerms;
      await api(`/ministry/members/${selected.id}`, { method: "PUT", body });
      setSelected(null);
      await load();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const promoteToLeader = () => {
    confirm({
      title: "Promover a líder?",
      message: `${selected?.name} terá acesso total ao ministério (100% das permissões), inclusive convidar novos membros e gerenciar outros usuários.`,
      confirmText: "Promover",
      onConfirm: () => {
        setDraftRole("leader");
        setDraftPerms([PERMS.EDIT_SCALES, PERMS.EDIT_SONGS, PERMS.EDIT_ANNOUNCEMENTS]);
      },
    });
  };

  const demoteToMember = () => {
    confirm({
      title: "Remover liderança?",
      message: `${selected?.name} voltará a ser membro comum. Selecione manualmente as permissões depois.`,
      confirmText: "Remover liderança",
      destructive: true,
      onConfirm: () => {
        setDraftRole("member");
        setDraftPerms([]);
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} testID="membros-screen" edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Membros</Text>
        {isLeader ? (
          <TouchableOpacity onPress={() => router.push("/convidar")} testID="invite-btn">
            <Ionicons name="person-add" size={22} color={colors.olive} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.olive} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMe = item.id === user?.id;
            const canManage = isLeader && !isMe;
            return (
              <TouchableOpacity
                style={styles.item}
                disabled={!canManage}
                activeOpacity={canManage ? 0.7 : 1}
                onPress={() => canManage && openManage(item)}
                testID={`member-${item.id}`}
              >
                <View style={[styles.avatar, { backgroundColor: item.avatar_color }]}>
                  <Text style={styles.avatarText}>{item.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.role === "leader" && <Ionicons name="star" size={12} color={colors.gold} />}
                    {isMe && <Text style={styles.youTag}>você</Text>}
                  </View>
                  <Text style={styles.muted}>{item.email}</Text>
                  {item.instruments.length > 0 && (
                    <View style={styles.chips}>
                      {item.instruments.map((i) => (
                        <View key={i} style={styles.chip}><Text style={styles.chipText}>{i}</Text></View>
                      ))}
                    </View>
                  )}
                  {item.role === "member" && item.permissions.length > 0 && (
                    <View style={styles.permRow}>
                      {item.permissions.map((p) => (
                        <View key={p} style={styles.permBadge}>
                          <Text style={styles.permBadgeText}>
                            {PERM_LABELS.find((x) => x.key === p)?.label || p}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {item.role === "member" && item.permissions.length === 0 && (
                    <Text style={styles.viewerTag}>Somente visualização</Text>
                  )}
                </View>
                {canManage && <Ionicons name="settings-outline" size={20} color={colors.textDisabled} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Manage modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
        transparent={false}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelected(null)} testID="cancel-manage">
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Gerenciar</Text>
            <TouchableOpacity onPress={saveChanges} disabled={saving} testID="save-manage">
              {saving ? <ActivityIndicator color={colors.olive} /> : <Text style={styles.saveText}>Salvar</Text>}
            </TouchableOpacity>
          </View>

          {selected && (
            <View style={styles.modalContent}>
              <View style={styles.memberCard}>
                <View style={[styles.bigAvatar, { backgroundColor: selected.avatar_color }]}>
                  <Text style={styles.bigAvatarText}>{selected.name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{selected.name}</Text>
                <Text style={styles.muted}>{selected.email}</Text>
              </View>

              <Text style={styles.section}>PAPEL NO MINISTÉRIO</Text>
              {draftRole === "leader" ? (
                <View style={styles.leaderCard}>
                  <Ionicons name="star" size={22} color={colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderTitle}>Líder</Text>
                    <Text style={styles.leaderDesc}>Acesso irrestrito a todas as funcionalidades</Text>
                  </View>
                  <TouchableOpacity style={styles.dangerBtn} onPress={demoteToMember} testID="demote-btn">
                    <Text style={styles.dangerText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.promoteBtn} onPress={promoteToLeader} testID="promote-btn">
                  <Ionicons name="star-outline" size={20} color={colors.gold} />
                  <Text style={styles.promoteText}>Promover a líder</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                </TouchableOpacity>
              )}

              {draftRole === "member" && (
                <>
                  <Text style={styles.section}>PERMISSÕES INDIVIDUAIS</Text>
                  <Text style={styles.helperText}>
                    Sem nenhuma selecionada, o membro terá apenas visualização.
                  </Text>
                  {PERM_LABELS.map((p) => (
                    <View key={p.key} style={styles.permItem}>
                      <Ionicons name={p.icon} size={20} color={colors.olive} />
                      <Text style={styles.permLabel}>{p.label}</Text>
                      <Switch
                        value={draftPerms.includes(p.key)}
                        onValueChange={() => togglePerm(p.key)}
                        trackColor={{ false: colors.surfaceElevated, true: colors.olive }}
                        thumbColor="#fff"
                        testID={`toggle-${p.key}`}
                      />
                    </View>
                  ))}
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={16} color={colors.info} />
                    <Text style={styles.infoText}>
                      Membros comuns nunca podem convidar novos membros ou promover outros usuários, mesmo com permissões de edição.
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  title: { fontSize: 22, fontWeight: "600", color: colors.text },
  saveText: { color: colors.olive, fontWeight: "600", fontSize: 15 },
  list: { padding: spacing.lg, gap: 10 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: 18 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  youTag: { fontSize: 10, color: colors.textSecondary, backgroundColor: colors.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, fontWeight: "600" },
  muted: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  chip: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontSize: 10, color: colors.olive, fontWeight: "600" },
  permRow: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  permBadge: { backgroundColor: "#E8F3EE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  permBadgeText: { fontSize: 10, color: colors.success, fontWeight: "600" },
  viewerTag: { fontSize: 11, color: colors.textDisabled, marginTop: 6, fontStyle: "italic" },
  modalContent: { padding: spacing.lg, gap: 8 },
  memberCard: { alignItems: "center", paddingVertical: spacing.md },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  bigAvatarText: { color: "#fff", fontWeight: "600", fontSize: 28 },
  memberName: { fontSize: 18, fontWeight: "600", color: colors.text },
  section: { fontSize: 11, letterSpacing: 1.2, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.md, marginBottom: 8 },
  helperText: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  leaderCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, backgroundColor: colors.olive, borderRadius: radius.lg,
  },
  leaderTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  leaderDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  dangerBtn: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dangerText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  promoteBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gold,
  },
  promoteText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  permItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  permLabel: { flex: 1, fontSize: 14, color: colors.text },
  infoBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: "#EEF4F7", borderRadius: radius.md, padding: 10, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 11, color: colors.text, lineHeight: 16 },
});
