import { Platform, Share } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getToken } from "@/src/api/client";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

async function fetchScaleHTML(scaleId: string): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/scales/${scaleId}/export.html`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Falha ao gerar a escala");
  return await res.text();
}

/** Builds a plain text representation of a scale for WhatsApp/SMS sharing. */
export function scaleToText(scale: {
  title: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
  assignments: { user_name: string; instrument: string }[];
}, songs: { title: string; artist?: string; key?: string; bpm?: number | null }[]): string {
  const lines: string[] = [];
  const [y, m, d] = scale.date.split("-");
  lines.push(`🎵 *${scale.title}*`);
  lines.push(`📅 ${d}/${m}/${y}${scale.time ? " • " + scale.time : ""}`);
  if (scale.location) lines.push(`📍 ${scale.location}`);
  if (scale.notes) lines.push(`📝 ${scale.notes}`);
  lines.push("");
  lines.push("*Músicos:*");
  if (scale.assignments.length === 0) lines.push("_Nenhum atribuído_");
  scale.assignments.forEach((a) => lines.push(`• ${a.user_name} — ${a.instrument}`));
  lines.push("");
  lines.push("*Repertório:*");
  if (songs.length === 0) lines.push("_Sem músicas_");
  songs.forEach((s, i) => {
    const extras = [s.key && `Tom: ${s.key}`, s.bpm && `${s.bpm} BPM`].filter(Boolean).join(" | ");
    lines.push(`${i + 1}. ${s.title}${s.artist ? " — " + s.artist : ""}${extras ? " (" + extras + ")" : ""}`);
  });
  lines.push("");
  lines.push("_Gerado pelo LouvorApp_");
  return lines.join("\n");
}

/** Share scale as plain text (works on web and native). */
export async function shareScaleText(text: string, title: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text });
        return;
      } catch {}
    }
    // Fallback: open WhatsApp web with prefilled text
    if (typeof window !== "undefined") {
      const enc = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${enc}`, "_blank");
    }
    return;
  }
  await Share.share({ message: text, title });
}

/** Generate a PDF of the scale and offer share/save. */
export async function shareScalePDF(scaleId: string, title: string): Promise<void> {
  const html = await fetchScaleHTML(scaleId);
  if (Platform.OS === "web") {
    // Open in new tab; user can Save/Print as PDF
    if (typeof window !== "undefined") {
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        // give it a moment then trigger print dialog
        setTimeout(() => {
          try { w.print(); } catch {}
        }, 400);
      }
    }
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });
  }
}
