import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirmation dialog.
 * On native: uses Alert.alert with destructive style.
 * On web: uses window.confirm (React Native Web's Alert.alert doesn't reliably fire the destructive callback).
 */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const {
    title,
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    destructive = false,
    onConfirm,
  } = opts;

  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    if (typeof window !== "undefined" && window.confirm(text)) {
      void onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: "cancel" },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
}
