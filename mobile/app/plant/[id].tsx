import { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { PrimaryButton } from "@/components/PrimaryButton";
import { WaterStatusPill } from "@/components/WaterStatusPill";
import { PetBadge } from "@/components/PetBadge";
import { getPlant, getScan } from "@/services/storage";
import {
  SNOOZE_DAYS,
  markFertilized,
  markWatered,
  removeFromMyPlants,
  renamePlant,
  setFeedInterval,
  setWaterInterval,
  snoozeWatering,
} from "@/services/garden";
import {
  daysSinceWatered,
  daysUntilWater,
  effectiveInterval,
  nextFeedDate,
  nextWaterDate,
  suggestedInterval,
} from "@/services/watering";
import { isGrowingSeason } from "@/services/seasons";
import { formatHour, getReminderHour, hasReminderPermission } from "@/services/reminders";
import type { GardenPlant } from "@/types/plant";

function formatDay(date: Date): string {
  return date.toLocaleDateString(i18n.language, { weekday: "long", month: "short", day: "numeric" });
}

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [plant, setPlant] = useState<GardenPlant | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [scanExists, setScanExists] = useState(false);
  const [suggested, setSuggested] = useState<number | null>(null);
  const [reminderHour, setReminderHourState] = useState<number | null>(null);
  const [justWatered, setJustWatered] = useState(false);
  const [justSnoozed, setJustSnoozed] = useState(false);
  const [justFed, setJustFed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const p = await getPlant(id);
        setPlant(p);
        if (!p) return;
        setName(p.name);
        const scan = p.scanId ? await getScan(p.scanId) : null;
        setScanExists(!!scan);
        setSuggested(scan ? suggestedInterval(scan.analysis.care.water.intervalDays) : null);
        const [granted, hour] = await Promise.all([hasReminderPermission(), getReminderHour()]);
        setReminderHourState(granted ? hour : null);
      })();
    }, [id])
  );

  if (plant === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-leaf-50">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (plant === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-leaf-50 px-8">
        <Text className="text-lg text-gray-600">{t("plant.removed")}</Text>
      </SafeAreaView>
    );
  }

  const since = daysSinceWatered(plant);
  const now = new Date();
  const winterInterval = effectiveInterval(plant, now);
  const feedDay = nextFeedDate(plant);

  async function water() {
    const updated = await markWatered(plant!.id);
    if (updated) setPlant(updated);
    setJustWatered(true);
  }

  async function snooze() {
    const updated = await snoozeWatering(plant!.id);
    if (updated) setPlant(updated);
    setJustSnoozed(true);
  }

  async function fertilize() {
    const updated = await markFertilized(plant!.id);
    if (updated) setPlant(updated);
    setJustFed(true);
  }

  async function changeFeedInterval(days: number | null) {
    const updated = await setFeedInterval(plant!.id, days);
    if (updated) setPlant(updated);
  }

  async function changeInterval(delta: number) {
    const updated = await setWaterInterval(plant!.id, plant!.waterIntervalDays + delta);
    if (updated) setPlant(updated);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === plant!.name) return setName(plant!.name);
    const updated = await renamePlant(plant!.id, trimmed);
    if (updated) setPlant(updated);
  }

  function confirmRemove() {
    Alert.alert(t("plant.removeTitle", { name: plant!.name }), t("plant.removeBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          await removeFromMyPlants(plant!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <Stack.Screen options={{ title: plant.name }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: plant.imageUri }} className="w-full h-60 rounded-3xl bg-leaf-100 mb-4" />

        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          returnKeyType="done"
          className="text-2xl font-extrabold text-leaf-900 py-1"
          accessibilityLabel={t("plant.nameLabel")}
        />
        <Text className="text-base italic text-leaf-600 mb-1">{plant.scientificName}</Text>
        <View className="mb-2">
          <PetBadge safety={plant.petSafety} />
        </View>
        <Text className="text-xs text-gray-400 mb-4">{t("plant.renameHint")}</Text>

        {/* Watering */}
        <View className="bg-white rounded-3xl p-5 mb-4 border border-sky-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-leaf-900">{t("plant.watering")}</Text>
            <WaterStatusPill plant={plant} />
          </View>

          <Text className="text-base text-gray-700">
            {t("plant.next")}<Text className="font-bold">{formatDay(nextWaterDate(plant))}</Text>
          </Text>
          <Text className="text-base text-gray-700 mb-1">
            {since === 0 ? t("plant.lastWateredToday") : t("plant.lastWatered", { count: since })}
          </Text>
          {winterInterval !== plant.waterIntervalDays && (
            <Text className="text-sm text-sky-800 bg-sky-50 rounded-xl px-3 py-2 my-1">
              {t("plant.winterNote", {
                days: t("common.days", { count: winterInterval }),
                normal: t("common.days", { count: plant.waterIntervalDays }),
              })}
            </Text>
          )}
          <Text className="text-sm text-gray-500 mb-4">{reminderHour !== null ? t("plant.reminderAt", { time: formatHour(reminderHour) }) : t("plant.remindersOff")}</Text>

          <PrimaryButton label={justWatered ? t("plant.wateredNice") : t("plant.iWatered")} onPress={water} disabled={justWatered} />
          {/* Only when a reminder is actually due: postpone instead of fake-watering. */}
          {(daysUntilWater(plant) <= 0 || justSnoozed) && !justWatered && (
            <View className="mt-3">
              <PrimaryButton
                label={justSnoozed ? t("plant.snoozedNice", { count: SNOOZE_DAYS }) : t("plant.notYet")}
                variant="secondary"
                onPress={snooze}
                disabled={justSnoozed}
              />
            </View>
          )}

          <View className="flex-row items-center justify-between mt-5">
            <View className="flex-1">
              <Text className="text-base font-semibold text-leaf-900">{t("plant.waterEvery")}</Text>
              {suggested !== null && suggested !== plant.waterIntervalDays && (
                <Text className="text-sm text-gray-500">{t("plant.suggests", { count: suggested })}</Text>
              )}
            </View>
            <Stepper label={t("common.days", { count: plant.waterIntervalDays })} onMinus={() => changeInterval(-1)} onPlus={() => changeInterval(1)} />
          </View>
          <Text className="text-sm text-gray-500 mt-2">
            {t("plant.intervalTip")}
          </Text>
        </View>

        {/* Fertilizing */}
        <View className="bg-white rounded-3xl p-5 mb-4 border border-leaf-100">
          <Text className="text-lg font-bold text-leaf-900 mb-3">{t("plant.fertilizing")}</Text>
          {feedDay && plant.fertilizeIntervalDays ? (
            <>
              <Text className="text-base text-gray-700">
                {t("plant.nextFeed")}
                <Text className="font-bold">{formatDay(feedDay)}</Text>
              </Text>
              {!isGrowingSeason(now) && <Text className="text-sm text-gray-500 mt-1">{t("plant.restingUntilSpring")}</Text>}
              <View className="mt-4">
                <PrimaryButton
                  label={justFed ? t("plant.fertilizedNice") : t("plant.iFertilized")}
                  variant="secondary"
                  onPress={fertilize}
                  disabled={justFed}
                />
              </View>
              <View className="flex-row items-center justify-between mt-5">
                <Text className="text-base font-semibold text-leaf-900 flex-1">{t("plant.feedEvery")}</Text>
                <Stepper
                  label={t("common.days", { count: plant.fertilizeIntervalDays })}
                  onMinus={() => changeFeedInterval(plant.fertilizeIntervalDays! - 7)}
                  onPlus={() => changeFeedInterval(plant.fertilizeIntervalDays! + 7)}
                />
              </View>
              <Pressable onPress={() => changeFeedInterval(null)} className="pt-4" hitSlop={6}>
                <Text className="text-sm font-semibold text-gray-500">{t("plant.fertilizeTurnOff")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-base text-gray-600 mb-3">{t("plant.fertilizeOff")}</Text>
              <PrimaryButton label={t("plant.fertilizeTurnOn")} variant="secondary" onPress={() => changeFeedInterval(30)} />
            </>
          )}
        </View>

        {scanExists && plant.scanId && (
          <View className="mb-3">
            <PrimaryButton label={t("plant.fullGuide")} variant="secondary" onPress={() => router.push(`/result/${plant.scanId}`)} />
          </View>
        )}
        <View className="mb-3">
          <PrimaryButton label={t("plant.newHealthScan")} variant="secondary" onPress={() => router.push("/capture")} />
        </View>

        <Pressable onPress={confirmRemove} className="py-4 items-center">
          <Text className="text-base font-semibold text-red-600">{t("plant.removeFromPlants")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center bg-leaf-50 rounded-2xl border border-leaf-200">
      <Pressable onPress={onMinus} className="px-4 py-2" hitSlop={6} accessibilityLabel={t("plant.fewerDays")}>
        <Text className="text-2xl font-bold text-leaf-800">−</Text>
      </Pressable>
      <Text className="text-base font-bold text-leaf-900 min-w-[64px] text-center">{label}</Text>
      <Pressable onPress={onPlus} className="px-4 py-2" hitSlop={6} accessibilityLabel={t("plant.moreDays")}>
        <Text className="text-2xl font-bold text-leaf-800">+</Text>
      </Pressable>
    </View>
  );
}
