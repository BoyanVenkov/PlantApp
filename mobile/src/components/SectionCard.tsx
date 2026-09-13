import { View, Text } from "react-native";
import type { ReactNode } from "react";

interface Props {
  icon: string;
  title: string;
  children: ReactNode;
}

export function SectionCard({ icon, title, children }: Props) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-leaf-100">
      <View className="flex-row items-center mb-2">
        <Text className="text-xl mr-2">{icon}</Text>
        <Text className="text-base font-bold text-leaf-900">{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2">
      <Text className="text-xs font-semibold text-leaf-600 uppercase tracking-wide">{label}</Text>
      <Text className="text-sm text-gray-700 mt-0.5">{value}</Text>
    </View>
  );
}
