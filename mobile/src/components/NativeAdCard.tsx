import { useEffect, useState } from "react";
import { View, Text, Image, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } from "react-native-google-mobile-ads";
import { nativeUnitId } from "@/services/ads";

/**
 * An ad styled like the app's own cards, clearly labeled. Renders nothing
 * until an ad loads, and nothing at all on no-fill — never an empty box.
 * `withMedia` adds the large image/video; use it only on long scrolling pages.
 * `style` is for outer spacing, so a no-fill leaves no gap behind.
 */
export function NativeAdCard({ withMedia = false, style }: { withMedia?: boolean; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const [ad, setAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: NativeAd | null = null;
    NativeAd.createForAdRequest(nativeUnitId)
      .then((a) => {
        if (cancelled) return a.destroy();
        loaded = a;
        setAd(a);
      })
      .catch(() => {}); // No fill / offline: just show nothing.
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, []);

  if (!ad) return null;

  return (
    // className doesn't reach third-party views, so the card styling lives on the inner View.
    <NativeAdView nativeAd={ad} style={[{ marginBottom: 12 }, style]}>
      <View className="bg-white rounded-2xl p-4 border border-leaf-100">
        <View className="flex-row items-center">
          {ad.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: ad.icon.url }} className="w-11 h-11 rounded-xl mr-3" />
            </NativeAsset>
          )}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-xs font-bold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5 mr-2">
                {t("common.ad")}
              </Text>
              {ad.advertiser && (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                    {ad.advertiser}
                  </Text>
                </NativeAsset>
              )}
            </View>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text className="text-base font-bold text-leaf-900 mt-1" numberOfLines={2}>
                {ad.headline}
              </Text>
            </NativeAsset>
          </View>
        </View>

        {!!ad.body && (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
              {ad.body}
            </Text>
          </NativeAsset>
        )}

        {withMedia && (
          <NativeMediaView
            resizeMode="cover"
            style={{ width: "100%", aspectRatio: 16 / 9, marginTop: 12, borderRadius: 12 }}
          />
        )}

        {!!ad.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text className="text-base font-bold text-white bg-leaf-600 rounded-xl text-center py-2.5 mt-3 overflow-hidden">
              {ad.callToAction}
            </Text>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
}
