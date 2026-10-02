import { Alert, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import i18n from "@/i18n";

/** Where "Send feedback" goes. The button is hidden while this is unset. */
export const FEEDBACK_EMAIL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL || "";

/**
 * Opens the mail app with a draft. The footer gives enough context to
 * reproduce a bug report without asking the tester follow-up questions.
 */
export async function sendFeedback(): Promise<void> {
  const footer = [
    "",
    "",
    "---",
    `Leafkin ${Constants.expoConfig?.version ?? "?"} · ${Platform.OS} ${Platform.Version} · ${i18n.language}`,
  ].join("\n");
  const url =
    `mailto:${FEEDBACK_EMAIL}` +
    `?subject=${encodeURIComponent("Leafkin feedback")}` +
    `&body=${encodeURIComponent(footer)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(i18n.t("settings.feedbackTitle"), i18n.t("settings.feedbackNoMail", { email: FEEDBACK_EMAIL }));
  }
}
