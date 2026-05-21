import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

const EMERGENT_AUTH = "https://auth.emergentagent.com";

function parseHashOrQuery(url: string): { session_id?: string } {
  try {
    const u = new URL(url);
    const fromHash = new URLSearchParams(u.hash.replace(/^#/, ""));
    const fromQuery = new URLSearchParams(u.search);
    return {
      session_id: fromHash.get("session_id") || fromQuery.get("session_id") || undefined,
    };
  } catch {
    return {};
  }
}

/** Initiates Google sign-in via Emergent Auth and returns the session_id (or null on cancel/fail). */
export async function signInWithGoogleEmergent(): Promise<string | null> {
  // Build redirect back to current app
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return null;
    // Persist target so /auth/callback knows where to go after consumption
    const here = window.location.origin + "/auth/callback";
    const url = `${EMERGENT_AUTH}/?redirect=${encodeURIComponent(here)}`;
    window.location.href = url;
    return null; // page navigates away
  }

  // Native: open in browser and listen for redirect
  const redirectUri = Linking.createURL("auth/callback");
  const url = `${EMERGENT_AUTH}/?redirect=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
  if (result.type !== "success" || !result.url) return null;
  const { session_id } = parseHashOrQuery(result.url);
  return session_id || null;
}
