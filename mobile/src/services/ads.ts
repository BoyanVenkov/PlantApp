import { Platform } from "react-native";
import mobileAds, { InterstitialAd, AdEventType, TestIds } from "react-native-google-mobile-ads";
import { isPro } from "./subscriptions";

const INTERSTITIAL_EVERY_N = Number(process.env.EXPO_PUBLIC_INTERSTITIAL_EVERY_N_SCANS || 3);

const interstitialUnitId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID,
  default: TestIds.INTERSTITIAL,
}) as string;

export const bannerUnitId = (Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
  default: TestIds.BANNER,
}) || TestIds.BANNER) as string;

let initialized = false;
let scanCountSinceLastAd = 0;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;

function loadNextInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(interstitialUnitId);
  interstitialLoaded = false;
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    loadNextInterstitial();
  });
  interstitial.load();
}

export async function initAds() {
  if (initialized) return;
  initialized = true;
  await mobileAds().initialize();
  loadNextInterstitial();
}

/**
 * Call once per completed scan. Shows an interstitial every N scans, and
 * never for Pro subscribers — this is the one place ad *frequency* is
 * controlled, so "not annoying" stays a one-line policy change away.
 */
export async function maybeShowInterstitialAfterScan() {
  if (await isPro()) return;

  scanCountSinceLastAd += 1;
  if (scanCountSinceLastAd < INTERSTITIAL_EVERY_N) return;

  if (interstitial && interstitialLoaded) {
    scanCountSinceLastAd = 0;
    interstitial.show();
  }
}
