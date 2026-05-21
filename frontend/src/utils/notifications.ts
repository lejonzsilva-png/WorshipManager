import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "@/src/api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function registerExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const ok = await ensureNotificationPermission();
    if (!ok) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("scales", {
        name: "Escalas",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2E412A",
      });
    }
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (token) {
      try {
        await api("/push/token", { method: "POST", body: { token, platform: Platform.OS } });
      } catch {}
    }
    return token || null;
  } catch {
    return null;
  }
}

/** Schedule a local reminder 1 day before the scale at 19h. Returns the notification id or null. */
export async function scheduleScaleReminder(scale: {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const ok = await ensureNotificationPermission();
    if (!ok) return null;
    const target = new Date(`${scale.date}T${scale.time || "19:30"}:00`);
    const remind = new Date(target.getTime() - 24 * 60 * 60 * 1000);
    if (remind.getTime() < Date.now() + 30_000) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📅 Lembrete de escala",
        body: `${scale.title} amanhã${scale.location ? ` • ${scale.location}` : ""}`,
        data: { scaleId: scale.id, type: "scale_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remind,
      } as any,
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelScheduledNotification(id: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function listScheduled() {
  if (Platform.OS === "web") return [];
  return await Notifications.getAllScheduledNotificationsAsync();
}
