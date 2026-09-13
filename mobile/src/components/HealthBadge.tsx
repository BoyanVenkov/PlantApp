import { View, Text } from "react-native";
import type { PlantAnalysis } from "@/types/plant";

const CONFIG: Record<PlantAnalysis["health"]["status"], { label: string; bg: string; fg: string; emoji: string }> = {
  healthy: { label: "Healthy", bg: "bg-leaf-100", fg: "text-leaf-800", emoji: "✅" },
  mild_stress: { label: "Mild stress", bg: "bg-amber-100", fg: "text-amber-800", emoji: "🟡" },
  sick: { label: "Sick", bg: "bg-orange-100", fg: "text-orange-800", emoji: "🟠" },
  critical: { label: "Critical", bg: "bg-red-100", fg: "text-red-800", emoji: "🔴" },
  unknown: { label: "Unclear", bg: "bg-gray-100", fg: "text-gray-700", emoji: "❔" },
};

export function HealthBadge({ status }: { status: PlantAnalysis["health"]["status"] }) {
  const c = CONFIG[status];
  return (
    <View className={`self-start rounded-full px-3 py-1.5 flex-row items-center ${c.bg}`}>
      <Text className="mr-1.5">{c.emoji}</Text>
      <Text className={`text-sm font-semibold ${c.fg}`}>{c.label}</Text>
    </View>
  );
}
