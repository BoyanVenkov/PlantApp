import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { bannerUnitId } from "@/services/ads";

/** Drop this at the bottom of a browse screen. */
export function AdBanner() {
  return (
    <View className="items-center bg-transparent py-1">
      <BannerAd unitId={bannerUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
