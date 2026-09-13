import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AdBanner } from "@/components/AdBanner";
import { listScans } from "@/services/storage";
import type { ScanRecord } from "@/types/plant";

export default function Home() {
  const router = useRouter();
  const [recent, setRecent] = useState<ScanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      listScans().then((all) => setRecent(all.slice(0, 6)));
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <View className="flex-1 px-5 pt-6">
        <Text className="text-3xl font-extrabold text-leaf-900">🌿 PlantApp</Text>
        <Text className="text-base text-leaf-700 mt-1 mb-6">
          Snap a photo — get an ID, a full care guide, a health check, and whether it's edible.
        </Text>

        <PrimaryButton label="📷 Scan a plant" onPress={() => router.push("/capture")} />

        <View className="flex-row mt-3 gap-3">
          <View className="flex-1">
            <PrimaryButton label="History" variant="secondary" onPress={() => router.push("/history")} />
          </View>
          <View className="flex-1">
            <PrimaryButton label="Settings" variant="secondary" onPress={() => router.push("/settings")} />
          </View>
        </View>

        {recent.length > 0 && (
          <>
            <Text className="text-lg font-bold text-leaf-900 mt-8 mb-3">Recent scans</Text>
            <FlatList
              data={recent}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => (
                <Pressable className="flex-1" onPress={() => router.push(`/result/${item.id}`)}>
                  <Image
                    source={{ uri: item.imageUris[0] }}
                    className="w-full aspect-square rounded-xl bg-leaf-100"
                  />
                  <Text numberOfLines={1} className="text-xs text-leaf-800 mt-1">
                    {item.analysis.identification.commonName}
                  </Text>
                </Pressable>
              )}
            />
          </>
        )}
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}
