import { useEffect, useState } from "react";
import { View, Text, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppStore } from "@/state/useAppStore";
import { getRemainingFreeScans, freeScansPerDay } from "@/services/usageLimiter";
import { isPro } from "@/services/subscriptions";

const MAX_IMAGES = 3;

export default function Capture() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pro, setPro] = useState(false);
  const setPendingImageUris = useAppStore((s) => s.setPendingImageUris);

  useEffect(() => {
    Promise.all([getRemainingFreeScans(), isPro()]).then(([r, p]) => {
      setRemaining(r);
      setPro(p);
    });
  }, []);

  const limitReached = !pro && remaining === 0;

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera permission needed", "Enable camera access in Settings to take a photo.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled) addImages(result.assets.map((a) => a.uri));
  }

  async function addFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Photos permission needed", "Enable photo library access in Settings.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
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
    setPendingImageUris(images);
    router.push("/analyzing");
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-lg font-bold text-leaf-900 mb-1">Add up to {MAX_IMAGES} photos</Text>
        <Text className="text-sm text-gray-500 mb-4">
          A close-up of a leaf plus one wider shot helps a lot for identification and health checks.
        </Text>

        {!pro && remaining !== null && (
          <View className={`rounded-xl px-3 py-2 mb-4 ${limitReached ? "bg-red-50" : "bg-leaf-50"}`}>
            <Text className={`text-xs font-semibold ${limitReached ? "text-red-700" : "text-leaf-700"}`}>
              {limitReached
                ? `You've used all ${freeScansPerDay} free scans today. Upgrade to Pro for unlimited scans.`
                : `${remaining} of ${freeScansPerDay} free scans left today.`}
            </Text>
          </View>
        )}

        <View className="flex-row flex-wrap gap-3 mb-4">
          {images.map((uri) => (
            <View key={uri}>
              <Image source={{ uri }} className="w-24 h-24 rounded-xl bg-leaf-50" />
              <Text
                onPress={() => removeImage(uri)}
                className="text-xs text-red-600 text-center mt-1 font-semibold"
              >
                Remove
              </Text>
            </View>
          ))}
        </View>

        {images.length < MAX_IMAGES && !limitReached && (
          <View className="gap-3">
            <PrimaryButton label="📷 Take a photo" onPress={addFromCamera} variant="secondary" />
            <PrimaryButton label="🖼️ Choose from library" onPress={addFromLibrary} variant="secondary" />
          </View>
        )}

        {limitReached && (
          <PrimaryButton label="✨ Upgrade to Pro" onPress={() => router.push("/paywall")} />
        )}
      </ScrollView>

      <View className="px-5 pb-2">
        <PrimaryButton
          label={`Analyze ${images.length > 0 ? `(${images.length} photo${images.length > 1 ? "s" : ""})` : ""}`}
          onPress={startAnalysis}
          disabled={images.length === 0 || limitReached}
        />
      </View>
    </SafeAreaView>
  );
}
