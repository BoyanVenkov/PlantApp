import { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getPlantByScanId, getScan } from "@/services/storage";
import { addScanToMyPlants, type LastWatered } from "@/services/garden";
import { suggestedInterval } from "@/services/watering";
import type { GardenPlant, ScanRecord } from "@/types/plant";
import { SectionCard, Field } from "@/components/SectionCard";
import { HealthBadge } from "@/components/HealthBadge";
import { NativeAdCard } from "@/components/NativeAdCard";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [scan, setScan] = useState<ScanRecord | null | undefined>(undefined);
  const [plant, setPlant] = useState<GardenPlant | null>(null);
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getScan(id).then(setScan);
      getPlantByScanId(id).then(setPlant);
    }, [id])
  );

  function askLastWatered() {
    const add = async (lastWatered: LastWatered) => {
      if (!scan) return;
      setAdding(true);
      const { plant: added, remindersOn } = await addScanToMyPlants(scan, lastWatered);
      setPlant(added);
      setAdding(false);
      if (!remindersOn) {
        Alert.alert(t("result.addedOffTitle"), t("result.addedOffBody"));
      }
    };
    Alert.alert(t("result.lastWateredTitle"), t("result.lastWateredBody"), [
      { text: t("result.today"), onPress: () => add("today") },
      { text: t("result.fewDaysAgo"), onPress: () => add("few_days_ago") },
      { text: t("result.needsNow"), onPress: () => add("needs_water") },
    ]);
  }

  if (scan === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (scan === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-lg text-gray-500">{t("result.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const { analysis, imageUris } = scan;

  if (!analysis.isPlant) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl mb-3">🤔</Text>
        <Text className="text-lg font-bold text-leaf-900 text-center mb-2">{t("result.notPlantTitle")}</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          {analysis.rejectionReason || t("result.notPlantFallback")}
        </Text>
        <PrimaryButton label={t("result.tryAnother")} onPress={() => router.replace("/capture")} />
      </SafeAreaView>
    );
  }

  const { identification, care, health, edibility } = analysis;
  const lowConfidence = identification.confidence < 0.55;

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Image source={{ uri: imageUris[0] }} className="w-full h-56 rounded-2xl bg-leaf-100 mb-4" />

        <Text className="text-2xl font-extrabold text-leaf-900">{identification.commonName}</Text>
        <Text className="text-sm italic text-leaf-600 mb-2">{identification.scientificName}</Text>

        {lowConfidence && (
          <View className="bg-amber-50 rounded-xl px-3 py-2 mb-3">
            <Text className="text-xs text-amber-800">
              {t("result.lowConfidence", { pct: Math.round(identification.confidence * 100) })}
            </Text>
          </View>
        )}

        <View className="mb-4">
          <HealthBadge status={health.status} />
        </View>

        {plant ? (
          <Pressable
            onPress={() => router.push(`/plant/${plant.id}`)}
            className="bg-leaf-100 rounded-2xl px-4 py-4 mb-4 flex-row items-center active:opacity-80"
          >
            <Text className="text-2xl mr-3">🪴</Text>
            <View className="flex-1">
              <Text className="text-base font-bold text-leaf-900">{t("result.inMyPlants")}</Text>
              <Text className="text-sm text-leaf-700">{t("result.wateringEvery", { count: plant.waterIntervalDays })}</Text>
            </View>
            <Text className="text-xl text-leaf-700">›</Text>
          </Pressable>
        ) : (
          <View className="mb-4">
            <PrimaryButton
              label={t("result.addToPlants", { count: suggestedInterval(care.water.intervalDays) })}
              onPress={askLastWatered}
              loading={adding}
            />
          </View>
        )}

        <SectionCard icon="🔎" title={t("result.identification")}>
          <Field label={t("result.family")} value={identification.family} />
          <Field label={t("result.confidence")} value={`${Math.round(identification.confidence * 100)}%`} />
          {identification.alternativeMatches.length > 0 && (
            <Field
              label={t("result.couldAlsoBe")}
              value={identification.alternativeMatches.map((m) => m.commonName).join(", ")}
            />
          )}
        </SectionCard>

        <SectionCard icon="🩺" title={t("result.health")}>
          <Text className="text-base text-gray-700 mb-2">{health.summary}</Text>
          {health.issuesDetected.length > 0 && (
            <Field label={t("result.issues")} value={health.issuesDetected.join(" • ")} />
          )}
          {health.recommendations.length > 0 && (
            <Field label={t("result.whatToDo")} value={health.recommendations.join("\n")} />
          )}
        </SectionCard>

        <SectionCard icon="💧" title={t("result.care")}>
          <Field label={t("result.light")} value={`${t(`levels.${care.light.level}`)} — ${care.light.description}`} />
          <Field label={t("result.water")} value={`${care.water.frequencyDescription} — ${care.water.description}`} />
          <Field
            label={t("result.temperature")}
            value={`${care.temperature.minCelsius}–${care.temperature.maxCelsius}°C — ${care.temperature.description}`}
          />
          <Field label={t("result.humidity")} value={`${t(`levels.${care.humidity.level}`)} — ${care.humidity.description}`} />
          <Field label={t("result.soil")} value={care.soil} />
          <Field label={t("result.fertilizing")} value={care.fertilizing} />
          <Field label={t("result.pruning")} value={care.pruning} />
          <Field label={t("result.propagation")} value={care.propagation} />
          <Field label={t("result.petToxicity")} value={care.petToxicity} />
        </SectionCard>

        <SectionCard icon={edibility.isEdible ? "🍽️" : "🚫"} title={t("result.edibility")}>
          <Field label={t("result.edibleQuestion")} value={edibility.isEdible ? t("result.yes") : t("result.no")} />
          {edibility.isEdible && edibility.edibleParts.length > 0 && (
            <Field label={t("result.edibleParts")} value={edibility.edibleParts.join(", ")} />
          )}
          {edibility.isEdible && edibility.benefits.length > 0 && (
            <Field label={t("result.benefits")} value={edibility.benefits.join(" • ")} />
          )}
          {edibility.risksAndWarnings.length > 0 && (
            <Field label={t("result.risks")} value={edibility.risksAndWarnings.join(" • ")} />
          )}
          {edibility.isEdible && edibility.preparationNotes && (
            <Field label={t("result.preparation")} value={edibility.preparationNotes} />
          )}
          <View className="bg-red-50 rounded-xl px-3 py-2 mt-2">
            <Text className="text-xs text-red-800">⚠️ {edibility.safetyDisclaimer}</Text>
          </View>
        </SectionCard>

        <NativeAdCard withMedia />

        <PrimaryButton label={t("result.scanAnother")} onPress={() => router.replace("/capture")} />
      </ScrollView>
    </SafeAreaView>
  );
}
