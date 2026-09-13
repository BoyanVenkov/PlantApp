import { useEffect, useState } from "react";
import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { bannerUnitId } from "@/services/ads";
import { isPro } from "@/services/subscriptions";

/**
 * Drop this at the bottom of a screen. Renders nothing for Pro subscribers —
 * that's the entire "pay to remove ads" contract, enforced in one place.
 */
export function AdBanner() {
  const [pro, setPro] = useState<boolean | null>(null);

  useEffect(() => {
    isPro().then(setPro);
  }, []);

  if (pro !== false) return null;

  return (
    <View className="items-center bg-transparent py-1">
      <BannerAd unitId={bannerUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
