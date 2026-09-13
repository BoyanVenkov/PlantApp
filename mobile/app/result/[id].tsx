import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getScan } from "@/services/storage";
import type { ScanRecord } from "@/types/plant";
import { SectionCard, Field } from "@/components/SectionCard";
import { HealthBadge } from "@/components/HealthBadge";
import { AdBanner } from "@/components/AdBanner";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<ScanRecord | null | undefined>(undefined);

  useEffect(() => {
    getScan(id).then(setScan);
  }, [id]);

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
        <Text className="text-base text-gray-500">Scan not found.</Text>
      </SafeAreaView>
    );
  }

  const { analysis, imageUris } = scan;

  if (!analysis.isPlant) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl mb-3">🤔</Text>
        <Text className="text-lg font-bold text-leaf-900 text-center mb-2">Couldn't identify a plant</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          {analysis.rejectionReason || "Try a clearer, well-lit photo of the plant."}
        </Text>
        <PrimaryButton label="Try another photo" onPress={() => router.replace("/capture")} />
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
              ⚠️ Not fully confident about this ID ({Math.round(identification.confidence * 100)}%). Consider a
              clearer photo for a firmer answer.
            </Text>
          </View>
        )}

        <View className="mb-3">
          <HealthBadge status={health.status} />
        </View>

        <SectionCard icon="🔎" title="Identification">
          <Field label="Family" value={identification.family} />
          <Field label="Confidence" value={`${Math.round(identification.confidence * 100)}%`} />
          {identification.alternativeMatches.length > 0 && (
            <Field
              label="Could also be"
              value={identification.alternativeMatches.map((m) => m.commonName).join(", ")}
            />
          )}
        </SectionCard>

        <SectionCard icon="🩺" title="Health check">
          <Text className="text-sm text-gray-700 mb-2">{health.summary}</Text>
          {health.issuesDetected.length > 0 && (
            <Field label="Issues spotted" value={health.issuesDetected.join(" • ")} />
          )}
          {health.recommendations.length > 0 && (
            <Field label="What to do" value={health.recommendations.join("\n")} />
          )}
        </SectionCard>

        <SectionCard icon="💧" title="Care guide">
          <Field label="Light" value={`${care.light.level.replace("_", " ")} — ${care.light.description}`} />
          <Field label="Water" value={`${care.water.frequencyDescription} — ${care.water.description}`} />
          <Field
            label="Temperature"
            value={`${care.temperature.minCelsius}–${care.temperature.maxCelsius}°C — ${care.temperature.description}`}
          />
          <Field label="Humidity" value={`${care.humidity.level} — ${care.humidity.description}`} />
          <Field label="Soil" value={care.soil} />
          <Field label="Fertilizing" value={care.fertilizing} />
          <Field label="Pruning" value={care.pruning} />
          <Field label="Propagation" value={care.propagation} />
          <Field label="Pet toxicity" value={care.petToxicity} />
        </SectionCard>

        <SectionCard icon={edibility.isEdible ? "🍽️" : "🚫"} title="Edibility">
          <Field label="Edible?" value={edibility.isEdible ? "Yes" : "No / not recommended"} />
          {edibility.isEdible && edibility.edibleParts.length > 0 && (
            <Field label="Edible parts" value={edibility.edibleParts.join(", ")} />
          )}
          {edibility.isEdible && edibility.benefits.length > 0 && (
            <Field label="Benefits" value={edibility.benefits.join(" • ")} />
          )}
          {edibility.risksAndWarnings.length > 0 && (
            <Field label="Risks & warnings" value={edibility.risksAndWarnings.join(" • ")} />
          )}
          {edibility.isEdible && edibility.preparationNotes && (
            <Field label="Preparation" value={edibility.preparationNotes} />
          )}
          <View className="bg-red-50 rounded-xl px-3 py-2 mt-2">
            <Text className="text-xs text-red-800">⚠️ {edibility.safetyDisclaimer}</Text>
          </View>
        </SectionCard>

        <PrimaryButton label="📷 Scan another plant" onPress={() => router.replace("/capture")} />
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}
