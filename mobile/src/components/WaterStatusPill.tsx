import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { GardenPlant } from "@/types/plant";
import { waterStatus, type WaterUrgency } from "@/services/watering";

const STYLES: Record<WaterUrgency, { bg: string; fg: string }> = {
  overdue: { bg: "bg-red-100", fg: "text-red-800" },
  today: { bg: "bg-sky-100", fg: "text-sky-800" },
  soon: { bg: "bg-leaf-100", fg: "text-leaf-800" },
  fine: { bg: "bg-gray-100", fg: "text-gray-700" },
};

export function WaterStatusPill({ plant }: { plant: GardenPlant }) {
  useTranslation(); // re-render when the language changes
  const { label, urgency } = waterStatus(plant);
  const s = STYLES[urgency];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-sm font-semibold ${s.fg}`}>💧 {label}</Text>
    </View>
  );
}
