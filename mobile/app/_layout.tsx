import "@/theme/global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initAds } from "@/services/ads";

export default function RootLayout() {
  useEffect(() => {
    initAds().catch((err) => console.warn("[ads] init failed:", err));
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: "700" }, headerTintColor: "#0f5132" }}>
        <Stack.Screen name="index" options={{ title: "Sproutly" }} />
        <Stack.Screen name="capture" options={{ title: "New scan" }} />
        <Stack.Screen name="analyzing" options={{ title: "Analyzing…", headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" options={{ title: "Your plant" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
        <Stack.Screen name="paywall" options={{ title: "Go Pro", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}
