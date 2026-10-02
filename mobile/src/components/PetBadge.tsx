import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { PetSafety } from "@/types/plant";

const STYLES: Record<Exclude<PetSafety, "unknown">, { bg: string; fg: string }> = {
  toxic: { bg: "bg-red-100", fg: "text-red-800" },
  mildly_toxic: { bg: "bg-amber-100", fg: "text-amber-800" },
  safe: { bg: "bg-leaf-100", fg: "text-leaf-800" },
};

/**
 * 🐾 for cats and dogs. Nothing for "unknown" or older scans. `warningsOnly`
 * hides the "safe" badge, for lists where only a warning is worth the space.
 */
export function PetBadge({ safety, warningsOnly = false }: { safety: PetSafety | null | undefined; warningsOnly?: boolean }) {
  const { t } = useTranslation();
  if (!safety || safety === "unknown" || (warningsOnly && safety === "safe")) return null;
  const s = STYLES[safety];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${s.bg}`}>
      <Text className={`text-sm font-semibold ${s.fg}`}>🐾 {t(`pets.${safety}`)}</Text>
    </View>
  );
}
