import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bg from "./locales/bg.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import id from "./locales/id.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import zh from "./locales/zh.json";

/**
 * `tag` is the BCP 47 tag sent to the server (so Gemini writes Brazilian
 * Portuguese, Simplified Chinese...) and used for date/time formatting.
 */
export const LANGUAGES = [
  { code: "en", tag: "en", name: "English", english: "English" },
  { code: "es", tag: "es", name: "Español", english: "Spanish" },
  { code: "pt", tag: "pt-BR", name: "Português (Brasil)", english: "Portuguese" },
  { code: "fr", tag: "fr", name: "Français", english: "French" },
  { code: "de", tag: "de", name: "Deutsch", english: "German" },
  { code: "it", tag: "it", name: "Italiano", english: "Italian" },
  { code: "nl", tag: "nl", name: "Nederlands", english: "Dutch" },
  { code: "pl", tag: "pl", name: "Polski", english: "Polish" },
  { code: "ru", tag: "ru", name: "Русский", english: "Russian" },
  { code: "uk", tag: "uk", name: "Українська", english: "Ukrainian" },
  { code: "bg", tag: "bg", name: "Български", english: "Bulgarian" },
  { code: "tr", tag: "tr", name: "Türkçe", english: "Turkish" },
  { code: "hi", tag: "hi", name: "हिन्दी", english: "Hindi" },
  { code: "id", tag: "id", name: "Bahasa Indonesia", english: "Indonesian" },
  { code: "ja", tag: "ja", name: "日本語", english: "Japanese" },
  { code: "ko", tag: "ko", name: "한국어", english: "Korean" },
  { code: "zh", tag: "zh-Hans", name: "简体中文", english: "Chinese (Simplified)" },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type LanguageCode = Language["code"];

const RESOURCES: Record<LanguageCode, object> = { bg, de, en, es, fr, hi, id, it, ja, ko, nl, pl, pt, ru, tr, uk, zh };

const STORAGE_KEY = "plantapp.language";

function findLanguage(code: string | null | undefined): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/** First phone language we support, else English. */
function deviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    const match = findLanguage(locale.languageCode);
    if (match) return match.code;
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(RESOURCES).map(([code, translation]) => [code, { translation }])),
  lng: deviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  initAsync: false,
});

/** Applies the language picked earlier in the app, overriding the phone's. */
export async function loadSavedLanguage(): Promise<void> {
  const saved = findLanguage(await AsyncStorage.getItem(STORAGE_KEY));
  if (saved) await i18n.changeLanguage(saved.code);
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(STORAGE_KEY, code);
}

export function currentLanguage(): Language {
  return findLanguage(i18n.language) ?? LANGUAGES[0];
}

export default i18n;
