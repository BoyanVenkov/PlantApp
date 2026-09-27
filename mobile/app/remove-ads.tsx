import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { getOffering, purchasePackage, restorePurchases, purchasesMockMode } from "@/services/subscriptions";
import { DAILY_SCAN_CAP } from "@/services/usageLimiter";
import { useAppStore } from "@/state/useAppStore";
import { PrimaryButton } from "@/components/PrimaryButton";

const BENEFITS = [
  "🚫 No banners, anywhere in the app",
  `▶️ No videos — up to ${DAILY_SCAN_CAP} scans a day, straight to results`,
  "💚 One payment, yours forever — not a subscription",
  "🌱 Helps keep Leafkin free for everyone else",
];

export default function RemoveAds() {
  const router = useRouter();
  const setAdFree = useAppStore((s) => s.setAdFree);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);

  useEffect(() => {
    getOffering().then(setOffering);
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    setBusyPackage(pkg.identifier);
    const success = await purchasePackage(pkg);
    setBusyPackage(null);
    if (success) {
      setAdFree(true);
      router.back();
    }
  }

  async function handleRestore() {
    const success = await restorePurchases();
    if (success) {
      setAdFree(true);
      router.back();
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-extrabold text-leaf-900 mb-1">Leafkin, ad-free</Text>
        <Text className="text-base text-gray-600 mb-6">Everything stays free. This just makes it quieter.</Text>

        <View className="gap-3 mb-8">
          {BENEFITS.map((b) => (
            <Text key={b} className="text-lg text-gray-800">
              {b}
            </Text>
          ))}
        </View>

        {purchasesMockMode && (
          <View className="bg-amber-50 rounded-xl px-4 py-3 mb-4">
            <Text className="text-sm text-amber-900">
              Dev mode: RevenueCat isn't configured yet (see mobile/.env.example), so purchasing is disabled here.
            </Text>
          </View>
        )}

        <View className="gap-3">
          {offering?.availablePackages.map((pkg) => (
            <PrimaryButton
              key={pkg.identifier}
              label={`Remove ads — ${pkg.product.priceString}`}
              onPress={() => handlePurchase(pkg)}
              loading={busyPackage === pkg.identifier}
            />
          ))}
        </View>

        {!purchasesMockMode && (
          <Text onPress={handleRestore} className="text-center text-base text-leaf-700 font-semibold mt-6">
            Restore purchase
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
