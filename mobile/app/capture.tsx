import { useCallback, useState } from "react";
import { View, Text, Image, Alert, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppStore } from "@/state/useAppStore";
import { DAILY_SCAN_CAP, getScanAllowance, type ScanAllowance } from "@/services/usageLimiter";

const MAX_IMAGES = 3;

export default function Capture() {
  const router = useRouter();
  const { t } = useTranslation();
  const adFree = useAppStore((s) => s.adFree);
  const setPendingScan = useAppStore((s) => s.setPendingScan);
  const [images, setImages] = useState<string[]>([]);
  const [allowance, setAllowance] = useState<ScanAllowance | null>(null);

  useFocusEffect(
    useCallback(() => {
      getScanAllowance(!!adFree).then(setAllowance);
    }, [adFree])
  );

  const limitReached = allowance?.totalLeft === 0;
  const needsAd = !!allowance?.nextNeedsAd;

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert(t("capture.cameraPermTitle"), t("capture.cameraPermBody"));
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!result.canceled) addImages(result.assets.map((a) => a.uri));
  }

  async function addFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t("capture.photosPermTitle"), t("capture.photosPermBody"));
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!result.canceled) addImages(result.assets.map((a) => a.uri));
  }

  function addImages(uris: string[]) {
    setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((u) => u !== uri));
  }

  function startAnalysis() {
    setPendingScan(images, needsAd);
    router.push("/analyzing");
  }

  const photoCount = images.length > 0 ? ` ${t("capture.photoCount", { count: images.length })}` : "";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-xl font-bold text-leaf-900 mb-1">{t("capture.title", { max: MAX_IMAGES })}</Text>
        <Text className="text-base text-gray-600 mb-4">
          {t("capture.tip")}
        </Text>

        {allowance && <AllowanceNote allowance={allowance} adFree={!!adFree} />}

        <View className="flex-row flex-wrap gap-3 mb-4">
          {images.map((uri) => (
            <View key={uri}>
              <Image source={{ uri }} className="w-28 h-28 rounded-xl bg-leaf-50" />
              <Pressable onPress={() => removeImage(uri)} className="py-1" hitSlop={8}>
                <Text className="text-sm text-red-600 text-center font-semibold">{t("common.remove")}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {images.length < MAX_IMAGES && !limitReached && (
          <View className="gap-3">
            <PrimaryButton label={t("capture.takePhoto")} onPress={addFromCamera} variant="secondary" />
            <PrimaryButton label={t("capture.chooseLibrary")} onPress={addFromLibrary} variant="secondary" />
          </View>
        )}
      </ScrollView>

      <View className="px-5 pb-2">
        <PrimaryButton
          label={(needsAd ? t("capture.analyzeWithAd") : t("capture.analyze")) + photoCount}
          onPress={startAnalysis}
          disabled={images.length === 0 || limitReached}
        />
      </View>
    </SafeAreaView>
  );
}

function AllowanceNote({ allowance, adFree }: { allowance: ScanAllowance; adFree: boolean }) {
  const { t } = useTranslation();
  let text: string;
  let tone = "bg-leaf-50 text-leaf-800";

  if (allowance.totalLeft === 0) {
    text = t("capture.limitNote", { cap: DAILY_SCAN_CAP });
    tone = "bg-amber-50 text-amber-900";
  } else if (adFree || allowance.freeLeft > 0) {
    text = t("common.freeScansLeft", { count: allowance.freeLeft });
  } else {
    text = t("capture.adNote", { left: allowance.totalLeft });
    tone = "bg-sky-50 text-sky-900";
  }

  const [bg, fg] = tone.split(" ");
  return (
    <View className={`rounded-xl px-4 py-3 mb-4 ${bg}`}>
      <Text className={`text-sm font-medium ${fg}`}>{text}</Text>
    </View>
  );
}
