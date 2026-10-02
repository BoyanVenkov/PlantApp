import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { restorePurchases, purchasesMockMode } from "@/services/subscriptions";
import {
  REMINDER_HOURS,
  ensureReminderPermission,
  formatHour,
  getReminderHour,
  hasReminderPermission,
  rescheduleAllReminders,
  setReminderHour,
} from "@/services/reminders";
import { DAILY_SCAN_CAP, FREE_SCANS_PER_DAY } from "@/services/usageLimiter";
import { useAppStore } from "@/state/useAppStore";
import { PrimaryButton } from "@/components/PrimaryButton";
import { LanguageButton } from "@/components/LanguagePicker";

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation();
  const adFree = useAppStore((s) => s.adFree);
  const setAdFree = useAppStore((s) => s.setAdFree);
  const [hour, setHour] = useState<number | null>(null);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      getReminderHour().then(setHour);
      hasReminderPermission().then(setNotifGranted);
    }, [])
  );

  async function pickHour(h: number) {
    setHour(h);
    await setReminderHour(h);
  }

  async function enableReminders() {
    const granted = await ensureReminderPermission();
    setNotifGranted(granted);
    if (granted) await rescheduleAllReminders();
    else Linking.openSettings();
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Card title={t("language.settingsTitle")}>
          <LanguageButton variant="row" />
          <Text className="text-sm text-gray-500 mt-2">{t("language.aiNote")}</Text>
        </Card>

        <Card title={t("settings.remindersTitle")}>
          {notifGranted === false ? (
            <>
              <Text className="text-base text-gray-600 mb-3">
                {t("settings.notifOff")}
              </Text>
              <PrimaryButton label={t("settings.turnOn")} onPress={enableReminders} />
            </>
          ) : (
            <>
              <Text className="text-base text-gray-600 mb-3">{t("settings.remindAt")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {REMINDER_HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => pickHour(h)}
                    className={`rounded-full px-4 py-2 border ${
                      hour === h ? "bg-leaf-600 border-leaf-600" : "bg-white border-leaf-200"
                    }`}
                  >
                    <Text className={`text-base font-semibold ${hour === h ? "text-white" : "text-leaf-800"}`}>
                      {formatHour(h)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </Card>

        <Card title={t("settings.scansTitle")}>
          <Text className="text-base text-gray-600">
            {adFree
              ? t("settings.scansAdFree", { cap: DAILY_SCAN_CAP })
              : t("settings.scansFree", { free: FREE_SCANS_PER_DAY, cap: DAILY_SCAN_CAP })}
          </Text>
        </Card>

        <Card title={t("settings.adsTitle")}>
          <Text className="text-base text-gray-600 mb-3">
            {adFree ? t("settings.adFreeThanks") : t("settings.adsSupported")}
          </Text>
          {!adFree && <PrimaryButton label={t("common.removeAds")} onPress={() => router.push("/remove-ads")} />}
          {!purchasesMockMode && (
            <View className="mt-2">
              <PrimaryButton
                label={t("common.restorePurchase")}
                variant="secondary"
                onPress={() => restorePurchases().then((ok) => ok && setAdFree(true))}
              />
            </View>
          )}
        </Card>

        <Card title={t("settings.aboutTitle")}>
          <Text className="text-base text-gray-600">{t("settings.version", { version: Constants.expoConfig?.version })}</Text>
          <Text className="text-sm text-gray-500 mt-2">
            {t("settings.disclaimer")}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-3xl p-5 border border-leaf-100">
      <Text className="text-lg font-bold text-leaf-900 mb-2">{title}</Text>
      {children}
    </View>
  );
}
