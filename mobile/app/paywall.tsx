import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { getOffering, purchasePackage, restorePurchases, subscriptionsMockMode } from "@/services/subscriptions";
import { PrimaryButton } from "@/components/PrimaryButton";

const BENEFITS = [
  "🚫 No ads, anywhere in the app",
  "♾️ Unlimited plant scans, every day",
  "⚡ Priority processing on new scans",
  "🌱 Support ongoing development",
];

export default function Paywall() {
  const router = useRouter();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);

  useEffect(() => {
    getOffering().then(setOffering);
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    setBusyPackage(pkg.identifier);
    const success = await purchasePackage(pkg);
    setBusyPackage(null);
    if (success) router.back();
  }

  async function handleRestore() {
    const success = await restorePurchases();
    if (success) router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-3xl font-extrabold text-leaf-900 mb-1">Sproutly Pro</Text>
        <Text className="text-sm text-gray-500 mb-6">One small subscription, zero interruptions.</Text>

        <View className="gap-2 mb-8">
          {BENEFITS.map((b) => (
            <Text key={b} className="text-base text-gray-700">
              {b}
            </Text>
          ))}
        </View>

        {subscriptionsMockMode && (
          <View className="bg-amber-50 rounded-xl px-3 py-2 mb-4">
            <Text className="text-xs text-amber-800">
              Dev mode: RevenueCat isn't configured yet (see mobile/.env.example), so purchases are disabled here.
              The rest of the app works normally in the free tier.
            </Text>
          </View>
        )}

        <View className="gap-3">
          {offering?.availablePackages.map((pkg) => (
            <PrimaryButton
              key={pkg.identifier}
              label={`${pkg.product.title} — ${pkg.product.priceString}`}
              onPress={() => handlePurchase(pkg)}
              loading={busyPackage === pkg.identifier}
            />
          ))}
        </View>

        {!subscriptionsMockMode && (
          <Text onPress={handleRestore} className="text-center text-sm text-leaf-700 font-semibold mt-6">
            Restore purchases
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
