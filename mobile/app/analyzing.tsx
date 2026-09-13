import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/state/useAppStore";
import { analyzePlant, DailyLimitReachedError } from "@/services/api";
import { saveScan } from "@/services/storage";
import { recordScanUsed } from "@/services/usageLimiter";
import { maybeShowInterstitialAfterScan } from "@/services/ads";
import { PrimaryButton } from "@/components/PrimaryButton";

const TIPS = [
  "🌱 Most houseplant deaths are from overwatering, not underwatering.",
  "🔍 Checking the undersides of leaves is the fastest way to catch pests early.",
  "☀️ 'Bright indirect light' means bright, but no direct sun rays hitting the leaves.",
  "🪴 A pot with no drainage hole is one of the most common causes of root rot.",
  "🌡️ Most tropical houseplants dislike cold drafts near windows and doors.",
];

export default function Analyzing() {
  const router = useRouter();
  const imageUris = useAppStore((s) => s.pendingImageUris);
  const clearPendingImageUris = useAppStore((s) => s.clearPendingImageUris);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (imageUris.length === 0) {
      router.replace("/capture");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const analysis = await analyzePlant(imageUris);
        if (cancelled) return;
        await recordScanUsed();
        const record = await saveScan(imageUris, analysis);
        clearPendingImageUris();
        maybeShowInterstitialAfterScan().catch(() => {});
        router.replace(`/result/${record.id}`);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DailyLimitReachedError) {
          setLimitHit(true);
        } else {
          console.error(err);
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (limitHit) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl mb-3">🌿</Text>
        <Text className="text-lg font-bold text-leaf-900 text-center mb-2">Daily free limit reached</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          Upgrade to PlantApp Pro for unlimited scans and an ad-free experience.
        </Text>
        <View className="w-full gap-3">
          <PrimaryButton label="✨ Upgrade to Pro" onPress={() => router.replace("/paywall")} />
          <PrimaryButton label="Back home" variant="secondary" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl mb-3">😕</Text>
        <Text className="text-lg font-bold text-leaf-900 text-center mb-2">Analysis failed</Text>
        <Text className="text-sm text-gray-500 text-center mb-6">{error}</Text>
        <View className="w-full gap-3">
          <PrimaryButton label="Try again" onPress={() => router.replace("/capture")} />
          <PrimaryButton label="Back home" variant="secondary" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-900 items-center justify-center px-8">
      {imageUris[0] && (
        <Image source={{ uri: imageUris[0] }} className="w-40 h-40 rounded-2xl mb-8 opacity-80" />
      )}
      <ActivityIndicator size="large" color="#fff" />
      <Text className="text-white text-lg font-semibold mt-4 mb-2">Consulting the botanist…</Text>
      <Text className="text-leaf-200 text-sm text-center">{TIPS[tipIndex]}</Text>
    </SafeAreaView>
  );
}
