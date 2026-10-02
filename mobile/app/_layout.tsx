import "@/theme/global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initAds } from "@/services/ads";
import { rescheduleAllReminders, setupReminderChannel, useReminderTaps } from "@/services/reminders";
import { useAppStore } from "@/state/useAppStore";

export default function RootLayout() {
  const refreshAdFree = useAppStore((s) => s.refreshAdFree);
  useReminderTaps();

  useEffect(() => {
    initAds().catch((err) => console.warn("[ads] init failed:", err));
    refreshAdFree().catch(() => useAppStore.getState().setAdFree(false));
    // Keeps reminders right after reinstalls, OS reboots, or time zone changes.
    setupReminderChannel()
      .then(rescheduleAllReminders)
      .catch((err) => console.warn("[reminders] reschedule failed:", err));
  }, [refreshAdFree]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: "700", fontSize: 19 },
          headerTintColor: "#0f5132",
          headerStyle: { backgroundColor: "#f0f9f1" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Leafkin" }} />
        <Stack.Screen name="capture" options={{ title: "New scan" }} />
        <Stack.Screen name="analyzing" options={{ title: "Analyzing…", headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" options={{ title: "Your plant" }} />
        <Stack.Screen name="plants" options={{ title: "My Plants" }} />
        <Stack.Screen name="plant/[id]" options={{ title: "" }} />
        <Stack.Screen name="history" options={{ title: "Scan history" }} />
        <Stack.Screen name="remove-ads" options={{ title: "Remove ads", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}
