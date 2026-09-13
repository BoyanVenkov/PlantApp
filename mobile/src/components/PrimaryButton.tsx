import { Pressable, Text, ActivityIndicator } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export function PrimaryButton({ label, onPress, disabled, loading, variant = "primary" }: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-2xl py-4 px-6 items-center justify-center ${
        isPrimary ? "bg-leaf-600" : "bg-leaf-50 border border-leaf-200"
      } ${disabled || loading ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "white" : "#2a7c38"} />
      ) : (
        <Text className={`text-base font-semibold ${isPrimary ? "text-white" : "text-leaf-800"}`}>{label}</Text>
      )}
    </Pressable>
  );
}
