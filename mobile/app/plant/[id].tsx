import { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { PrimaryButton } from "@/components/PrimaryButton";
import { WaterStatusPill } from "@/components/WaterStatusPill";
import { getPlant, getScan } from "@/services/storage";
import { markWatered, removeFromMyPlants, renamePlant, setWaterInterval } from "@/services/garden";
import { daysSinceWatered, nextWaterDate, suggestedInterval } from "@/services/watering";
import { formatHour, getReminderHour, hasReminderPermission } from "@/services/reminders";
import type { GardenPlant } from "@/types/plant";

function formatDay(date: Date): string {
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plant, setPlant] = useState<GardenPlant | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [scanExists, setScanExists] = useState(false);
  const [suggested, setSuggested] = useState<number | null>(null);
  const [reminderInfo, setReminderInfo] = useState<string | null>(null);
  const [justWatered, setJustWatered] = useState(false);

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
        setReminderInfo(granted ? `Reminder at ${formatHour(hour)} on the day` : null);
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
        <Text className="text-lg text-gray-600">This plant was removed.</Text>
      </SafeAreaView>
    );
  }

  const since = daysSinceWatered(plant);

  async function water() {
    const updated = await markWatered(plant!.id);
    if (updated) setPlant(updated);
    setJustWatered(true);
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
    Alert.alert(`Remove ${plant!.name}?`, "Its watering reminders will stop. The original scan stays in History.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
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
          accessibilityLabel="Plant name"
        />
        <Text className="text-base italic text-leaf-600 mb-1">{plant.scientificName}</Text>
        <Text className="text-xs text-gray-400 mb-4">Tap the name to rename it (e.g. “Kitchen monstera”).</Text>

        {/* Watering */}
        <View className="bg-white rounded-3xl p-5 mb-4 border border-sky-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-leaf-900">💧 Watering</Text>
            <WaterStatusPill plant={plant} />
          </View>

          <Text className="text-base text-gray-700">
            Next: <Text className="font-bold">{formatDay(nextWaterDate(plant))}</Text>
          </Text>
          <Text className="text-base text-gray-700 mb-1">
            Last watered: {since === 0 ? "today" : `${since} day${since === 1 ? "" : "s"} ago`}
          </Text>
          <Text className="text-sm text-gray-500 mb-4">{reminderInfo ?? "Reminders are off — turn them on in Settings."}</Text>

          <PrimaryButton label={justWatered ? "✓ Watered — nice!" : "💧 I watered it"} onPress={water} disabled={justWatered} />

          <View className="flex-row items-center justify-between mt-5">
            <View className="flex-1">
              <Text className="text-base font-semibold text-leaf-900">Water every</Text>
              {suggested !== null && suggested !== plant.waterIntervalDays && (
                <Text className="text-sm text-gray-500">Sproutly suggests {suggested} days</Text>
              )}
            </View>
            <Stepper label={`${plant.waterIntervalDays} day${plant.waterIntervalDays === 1 ? "" : "s"}`} onMinus={() => changeInterval(-1)} onPlus={() => changeInterval(1)} />
          </View>
          <Text className="text-sm text-gray-500 mt-2">
            Soil still wet on reminder day? Add a day or two. Drying out fast in summer? Take a day off.
          </Text>
        </View>

        {scanExists && plant.scanId && (
          <View className="mb-3">
            <PrimaryButton label="📖 Full care guide & health check" variant="secondary" onPress={() => router.push(`/result/${plant.scanId}`)} />
          </View>
        )}
        <View className="mb-3">
          <PrimaryButton label="📷 New health check scan" variant="secondary" onPress={() => router.push("/capture")} />
        </View>

        <Pressable onPress={confirmRemove} className="py-4 items-center">
          <Text className="text-base font-semibold text-red-600">Remove from My Plants</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-row items-center bg-leaf-50 rounded-2xl border border-leaf-200">
      <Pressable onPress={onMinus} className="px-4 py-2" hitSlop={6} accessibilityLabel="Fewer days">
        <Text className="text-2xl font-bold text-leaf-800">−</Text>
      </Pressable>
      <Text className="text-base font-bold text-leaf-900 min-w-[64px] text-center">{label}</Text>
      <Pressable onPress={onPlus} className="px-4 py-2" hitSlop={6} accessibilityLabel="More days">
        <Text className="text-2xl font-bold text-leaf-800">+</Text>
      </Pressable>
    </View>
  );
}
