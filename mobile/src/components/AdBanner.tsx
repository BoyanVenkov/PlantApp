import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { bannerUnitId } from "@/services/ads";
import { useAppStore } from "@/state/useAppStore";

/**
 * Drop this at the bottom of a browse screen. Renders nothing for "Remove ads"
 * buyers — that's the entire purchase contract, enforced in one place.
 */
export function AdBanner() {
  const adFree = useAppStore((s) => s.adFree);
  if (adFree !== false) return null;

  return (
    <View className="items-center bg-transparent py-1">
      <BannerAd unitId={bannerUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
