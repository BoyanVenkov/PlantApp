import "@/theme/global.css";
import "@/i18n";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { loadSavedLanguage } from "@/i18n";
import { initAds } from "@/services/ads";
import { rescheduleAllReminders, setupReminderChannel, useReminderTaps } from "@/services/reminders";
import { recordLaunch } from "@/services/reviewPrompt";

export default function RootLayout() {
  const { t } = useTranslation();
  // Held back until the saved language is applied, so the UI never flashes
  // in the phone's language first.
  const [languageReady, setLanguageReady] = useState(false);
  useReminderTaps();

  useEffect(() => {
    initAds().catch((err) => console.warn("[ads] init failed:", err));
    Promise.all([
      loadSavedLanguage().catch((err) => console.warn("[i18n] loading saved language failed:", err)),
      // Counted before Home renders, so its rating-prompt check sees this launch.
      recordLaunch().catch((err) => console.warn("[review] launch count failed:", err)),
    ])
      .then(() => setLanguageReady(true))
      // Keeps reminders right after reinstalls, OS reboots, or time zone
      // changes. Runs after the language loads since reminder text is localized.
      .then(setupReminderChannel)
      .then(rescheduleAllReminders)
      .catch((err) => console.warn("[reminders] reschedule failed:", err));
  }, []);

  if (!languageReady) return null;

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
        <Stack.Screen name="capture" options={{ title: t("nav.newScan") }} />
        <Stack.Screen name="analyzing" options={{ title: t("nav.analyzing"), headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" options={{ title: t("nav.yourPlant") }} />
        <Stack.Screen name="plants" options={{ title: t("nav.myPlants") }} />
        <Stack.Screen name="plant/[id]" options={{ title: "" }} />
        <Stack.Screen name="history" options={{ title: t("nav.history") }} />
        <Stack.Screen name="settings" options={{ title: t("nav.settings") }} />
      </Stack>
    </>
  );
}
