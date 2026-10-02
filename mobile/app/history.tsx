import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { listScans, deleteScan } from "@/services/storage";
import type { ScanRecord } from "@/types/plant";
import { HealthBadge } from "@/components/HealthBadge";
import { NativeAdCard } from "@/components/NativeAdCard";

export default function History() {
  const router = useRouter();
  const { t } = useTranslation();
  const [scans, setScans] = useState<ScanRecord[]>([]);

  const reload = useCallback(() => {
    listScans().then(setScans);
  }, []);

  useFocusEffect(reload);

  function confirmDelete(id: string) {
    Alert.alert(t("history.deleteTitle"), t("history.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteScan(id).then(reload) },
    ]);
  }

  if (scans.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-lg text-gray-500 text-center">{t("history.empty")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item, index }) => (
          <>
            <Pressable
              onPress={() => router.push(`/result/${item.id}`)}
              onLongPress={() => confirmDelete(item.id)}
              className="flex-row bg-white rounded-2xl p-3 items-center border border-leaf-100"
            >
              <Image source={{ uri: item.imageUris[0] }} className="w-20 h-20 rounded-xl bg-leaf-100 mr-3" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-leaf-900">{item.analysis.identification.commonName}</Text>
                <Text className="text-sm italic text-leaf-600 mb-1">{item.analysis.identification.scientificName}</Text>
                <HealthBadge status={item.analysis.health.status} />
              </View>
            </Pressable>
            {/* One ad, after the third scan, so short histories stay ad-free. */}
            {index === 2 && <NativeAdCard style={{ marginTop: 10, marginBottom: 0 }} />}
          </>
        )}
        ListFooterComponent={
          <Text className="text-sm text-gray-400 text-center mt-2">{t("history.longPressHint")}</Text>
        }
      />
    </SafeAreaView>
  );
}
