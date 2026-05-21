import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/src/context/AuthContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FDFBF7" } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="escala/[id]" options={{ presentation: "card" }} />
            <Stack.Screen name="escala/nova" options={{ presentation: "modal" }} />
            <Stack.Screen name="musica/[id]" options={{ presentation: "card" }} />
            <Stack.Screen name="musica/nova" options={{ presentation: "modal" }} />
            <Stack.Screen name="membros" />
            <Stack.Screen name="avisos" />
            <Stack.Screen name="aviso/novo" options={{ presentation: "modal" }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
