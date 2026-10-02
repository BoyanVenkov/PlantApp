import { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LANGUAGES, currentLanguage, setLanguage, type LanguageCode } from "@/i18n";
import { rescheduleAllReminders } from "@/services/reminders";

/**
 * "pill" sits in the Home header so people find it without hunting; "row" is
 * the Settings version. Both open the same sheet.
 */
export function LanguageButton({ variant = "pill" }: { variant?: "pill" | "row" }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = currentLanguage();

  return (
    <>
      {variant === "pill" ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel={t("language.change")}
          hitSlop={6}
          className="flex-row items-center bg-white border border-leaf-300 rounded-full px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-base">🌐</Text>
          <Text className="text-sm font-bold text-leaf-900 ml-1.5">{lang.code.toUpperCase()}</Text>
          <Text className="text-xs text-leaf-700 ml-1">▼</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel={t("language.change")}
          className="flex-row items-center justify-between bg-leaf-50 border border-leaf-200 rounded-2xl px-4 py-3 active:opacity-70"
        >
          <Text className="text-base font-semibold text-leaf-900">{lang.name}</Text>
          <Text className="text-xl text-leaf-700">›</Text>
        </Pressable>
      )}
      <LanguageSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const current = currentLanguage().code;

  async function pick(code: LanguageCode) {
    onClose();
    if (code === current) return;
    await setLanguage(code);
    // Scheduled notifications keep the text they were created with.
    rescheduleAllReminders().catch((err) => console.warn("[reminders] reschedule failed:", err));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel={t("common.cancel")} />
      <View className="bg-white rounded-t-3xl max-h-[75%]" style={{ paddingBottom: insets.bottom + 8 }}>
        <View className="items-center pt-3 pb-2">
          <View className="w-10 h-1.5 rounded-full bg-gray-300" />
        </View>
        <Text className="text-xl font-bold text-leaf-900 px-6 pb-3">🌐 {t("language.choose")}</Text>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {LANGUAGES.map((l) => {
            const selected = l.code === current;
            return (
              <Pressable
                key={l.code}
                onPress={() => pick(l.code)}
                className={`flex-row items-center rounded-2xl px-4 py-3 mb-1 active:opacity-70 ${selected ? "bg-leaf-100" : ""}`}
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-leaf-900">{l.name}</Text>
                  {l.name !== l.english && <Text className="text-sm text-gray-500">{l.english}</Text>}
                </View>
                {selected && <Text className="text-lg font-bold text-leaf-700">✓</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
