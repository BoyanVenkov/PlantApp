import { useRef, useState } from "react";
import { View, Text, Image, Pressable, Modal, Alert, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { PrimaryButton } from "@/components/PrimaryButton";
import { suggestedInterval } from "@/services/watering";
import type { ScanRecord } from "@/types/plant";

const LOGO = require("../../assets/splash-icon.png");

/**
 * Header button → a preview of the share card → the phone's share sheet.
 * The card is captured while it's on screen in the preview, which is the
 * reliable way to snapshot a view on both platforms.
 */
export function ShareResultButton({ scan }: { scan: ScanRecord }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 48, 360);

  function close() {
    setOpen(false);
    setPhotoReady(false);
  }

  async function share() {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "jpg", quality: 0.92 });
      await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: t("share.title"), UTI: "public.jpeg" });
      close();
    } catch (err) {
      console.warn("[share] failed:", err);
      Alert.alert(t("share.failed"));
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel={t("share.title")} className="px-2 py-1">
        <Text className="text-base font-bold text-leaf-900">📤 {t("share.button")}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View ref={cardRef} collapsable={false}>
            <ShareCard scan={scan} width={cardWidth} onPhotoLoad={() => setPhotoReady(true)} />
          </View>
          <View className="mt-5 gap-3" style={{ width: cardWidth }}>
            <PrimaryButton label={t("share.action")} onPress={share} loading={sharing} disabled={!photoReady} />
            <PrimaryButton label={t("common.cancel")} variant="secondary" onPress={close} />
          </View>
        </View>
      </Modal>
    </>
  );
}

/** 4:5, Instagram's portrait size. Only facts that are safe to pass around — no edibility claims. */
function ShareCard({ scan, width, onPhotoLoad }: { scan: ScanRecord; width: number; onPhotoLoad: () => void }) {
  const { t } = useTranslation();
  const { identification, care } = scan.analysis;
  const days = suggestedInterval(care.water.intervalDays);

  const facts = [
    `☀️ ${t("result.light")}: ${t(`levels.${care.light.level}`)}`,
    `💧 ${t("plant.waterEvery")} ${t("common.days", { count: days })}`,
  ];
  if (care.petSafety && care.petSafety !== "unknown") facts.push(`🐾 ${t(`pets.${care.petSafety}`)}`);

  return (
    <View className="bg-leaf-900 rounded-3xl p-4" style={{ width, aspectRatio: 4 / 5 }}>
      <Image
        source={{ uri: scan.imageUris[0] }}
        onLoad={onPhotoLoad}
        onError={onPhotoLoad}
        className="w-full flex-1 rounded-2xl bg-leaf-800"
        resizeMode="cover"
      />
      <Text className="text-2xl font-extrabold text-white mt-3" numberOfLines={1}>
        {identification.commonName}
      </Text>
      <Text className="text-sm italic text-leaf-200" numberOfLines={1}>
        {identification.scientificName}
      </Text>
      <View className="flex-row flex-wrap gap-1.5 mt-2">
        {facts.map((f) => (
          <Text key={f} className="text-xs font-semibold text-leaf-900 bg-leaf-100 rounded-full px-2.5 py-1 overflow-hidden">
            {f}
          </Text>
        ))}
      </View>
      <View className="flex-row items-center mt-3">
        <Image source={LOGO} className="w-6 h-6 mr-2" />
        <Text className="text-sm font-bold text-leaf-100">{t("share.identifiedWith")}</Text>
      </View>
    </View>
  );
}
