import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AdBanner } from "@/components/AdBanner";
import { PrimaryButton } from "@/components/PrimaryButton";
import { WaterStatusPill } from "@/components/WaterStatusPill";
import { listPlants } from "@/services/storage";
import { markWatered } from "@/services/garden";
import { daysUntilWater } from "@/services/watering";
import type { GardenPlant } from "@/types/plant";

export default function MyPlants() {
  const router = useRouter();
  const { t } = useTranslation();
  const [plants, setPlants] = useState<GardenPlant[] | null>(null);

  const reload = useCallback(() => {
    // Thirstiest first — this list is a to-do list, not an archive.
    listPlants().then((all) => setPlants(all.sort((a, b) => daysUntilWater(a) - daysUntilWater(b))));
  }, []);

  useFocusEffect(reload);

  async function water(id: string) {
    await markWatered(id);
    reload();
  }

  if (plants === null) return <SafeAreaView className="flex-1 bg-leaf-50" />;

  if (plants.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🪴</Text>
          <Text className="text-xl font-bold text-leaf-900 text-center mb-2">{t("plants.emptyTitle")}</Text>
          <Text className="text-base text-gray-600 text-center mb-6">
            {t("plants.emptyBody")}
          </Text>
          <View className="w-full">
            <PrimaryButton label={t("common.scanPlant")} onPress={() => router.push("/capture")} />
          </View>
        </View>
        <AdBanner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <FlatList
        data={plants}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const due = daysUntilWater(item) <= 0;
          return (
            <Pressable
              onPress={() => router.push(`/plant/${item.id}`)}
              className="flex-row items-center bg-white rounded-2xl p-3 border border-leaf-100 active:opacity-80"
            >
              <Image source={{ uri: item.imageUri }} className="w-20 h-20 rounded-xl bg-leaf-100 mr-3" />
              <View className="flex-1 mr-2">
                <Text className="text-lg font-bold text-leaf-900" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-sm italic text-leaf-600 mb-1.5" numberOfLines={1}>
                  {item.scientificName}
                </Text>
                <WaterStatusPill plant={item} />
              </View>
              {due && (
                <Pressable onPress={() => water(item.id)} className="bg-sky-600 rounded-xl px-4 py-3 active:opacity-80">
                  <Text className="text-base font-bold text-white">{t("common.watered")}</Text>
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />
      <AdBanner />
    </SafeAreaView>
  );
}
