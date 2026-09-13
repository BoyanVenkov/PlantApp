import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { listScans, deleteScan } from "@/services/storage";
import type { ScanRecord } from "@/types/plant";
import { HealthBadge } from "@/components/HealthBadge";

export default function History() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);

  const reload = useCallback(() => {
    listScans().then(setScans);
  }, []);

  useFocusEffect(reload);

  function confirmDelete(id: string) {
    Alert.alert("Delete scan?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteScan(id).then(reload) },
    ]);
  }

  if (scans.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-base text-gray-500 text-center">No scans yet. Go scan a plant!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-leaf-50" edges={["bottom"]}>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/result/${item.id}`)}
            onLongPress={() => confirmDelete(item.id)}
            className="flex-row bg-white rounded-2xl p-3 items-center border border-leaf-100"
          >
            <Image source={{ uri: item.imageUris[0] }} className="w-16 h-16 rounded-xl bg-leaf-100 mr-3" />
            <View className="flex-1">
              <Text className="font-bold text-leaf-900">{item.analysis.identification.commonName}</Text>
              <Text className="text-xs italic text-leaf-600 mb-1">{item.analysis.identification.scientificName}</Text>
              <HealthBadge status={item.analysis.health.status} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
