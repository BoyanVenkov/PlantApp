import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdBanner } from "@/components/AdBanner";
import { WaterStatusPill } from "@/components/WaterStatusPill";
import { listPlants, listScans } from "@/services/storage";
import { markWatered } from "@/services/garden";
import { daysUntilWater, needsWaterToday } from "@/services/watering";
import { getScanAllowance, type ScanAllowance } from "@/services/usageLimiter";
import { useAppStore } from "@/state/useAppStore";
import type { GardenPlant, ScanRecord } from "@/types/plant";

function allowanceLine(a: ScanAllowance | null, adFree: boolean | null): string {
  if (!a) return " ";
  if (a.totalLeft === 0) return "You've reached today's scan limit — back tomorrow 🌙";
  if (adFree || a.freeLeft > 0) return `${a.freeLeft} free scan${a.freeLeft === 1 ? "" : "s"} left today`;
  return "Free scans used — watch a short video for more";
}

export default function Home() {
  const router = useRouter();
  const adFree = useAppStore((s) => s.adFree);
  const [recent, setRecent] = useState<ScanRecord[]>([]);
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [allowance, setAllowance] = useState<ScanAllowance | null>(null);

  const reload = useCallback(() => {
    listScans().then((all) => setRecent(all.filter((s) => s.analysis.isPlant).slice(0, 6)));
    listPlants().then(setPlants);
    getScanAllowance(!!adFree).then(setAllowance);
  }, [adFree]);

  useFocusEffect(reload);

  const thirsty = plants.filter(needsWaterToday).sort((a, b) => daysUntilWater(a) - daysUntilWater(b));

  async function water(id: string) {
    await markWatered(id);
    reload();
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        {/* Scan hero */}
        <View className="bg-leaf-900 rounded-3xl p-6 mb-6">
          <Text className="text-2xl font-extrabold text-white">What plant is this?</Text>
          <Text className="text-base text-leaf-200 mt-1 mb-5">
            One photo → name, care guide, health check and whether it's safe to eat.
          </Text>
          <Pressable
            onPress={() => router.push("/capture")}
            className="bg-white rounded-2xl py-4 items-center active:opacity-80"
          >
            <Text className="text-lg font-bold text-leaf-900">📷 Scan a plant</Text>
          </Pressable>
          <Text className="text-sm text-leaf-300 text-center mt-3">{allowanceLine(allowance, adFree)}</Text>
        </View>

        {/* Needs water today */}
        {thirsty.length > 0 && (
          <View className="mb-6">
            <Text className="text-xl font-bold text-leaf-900 mb-3">💧 Needs water today</Text>
            <View className="gap-3">
              {thirsty.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/plant/${p.id}`)}
                  className="flex-row items-center bg-white rounded-2xl p-3 border border-sky-100"
                >
                  <Image source={{ uri: p.imageUri }} className="w-14 h-14 rounded-xl bg-leaf-100 mr-3" />
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-leaf-900" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <WaterStatusPill plant={p} />
                  </View>
                  <Pressable onPress={() => water(p.id)} className="bg-sky-600 rounded-xl px-4 py-3 active:opacity-80">
                    <Text className="text-base font-bold text-white">Watered</Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Shortcuts */}
        <View className="flex-row gap-3 mb-6">
          <Shortcut icon="🪴" label="My Plants" sub={plants.length ? `${plants.length}` : "Add one"} onPress={() => router.push("/plants")} />
          <Shortcut icon="🕘" label="History" sub={recent.length ? "Past scans" : "Empty"} onPress={() => router.push("/history")} />
          <Shortcut icon="⚙️" label="Settings" sub="Reminders" onPress={() => router.push("/settings")} />
        </View>

        {/* Recent scans */}
        {recent.length > 0 && (
          <>
            <Text className="text-xl font-bold text-leaf-900 mb-3">Recent scans</Text>
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {recent.map((item) => (
                <Pressable key={item.id} style={{ width: "31.5%" }} onPress={() => router.push(`/result/${item.id}`)}>
                  <Image source={{ uri: item.imageUris[0] }} className="w-full aspect-square rounded-xl bg-leaf-100" />
                  <Text numberOfLines={1} className="text-sm font-medium text-leaf-800 mt-1">
                    {item.analysis.identification.commonName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

function Shortcut({ icon, label, sub, onPress }: { icon: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl py-4 items-center border border-leaf-100 active:opacity-70">
      <Text className="text-3xl">{icon}</Text>
      <Text className="text-base font-bold text-leaf-900 mt-1">{label}</Text>
      <Text className="text-xs text-gray-500">{sub}</Text>
    </Pressable>
  );
}
