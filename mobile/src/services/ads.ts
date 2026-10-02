import { Platform } from "react-native";
import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";

/**
 * Ad policy (deliberately gentle — ratings are worth more than impressions):
 * - Banners at the bottom of Home and My Plants.
 * - Native ad cards (NativeAdCard) that look like the app's own cards: one on
 *   the Result screen, one in History after the third scan. They earn more
 *   than banners while being easier to scroll past.
 * - Never on the camera, analyzing, or plant-detail screens where people are
 *   doing something.
 * - No interstitials, ever. Nothing pops up uninvited.
 * - Rewarded videos only when the user taps a button that says "watch a short
 *   video", for scans beyond the daily free ones (see usageLimiter.ts).
 */

export const bannerUnitId = (Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
}) || TestIds.BANNER) as string;

export const nativeUnitId = (Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ID_ANDROID,
}) || TestIds.NATIVE) as string;

const rewardedUnitId = (Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID,
}) || TestIds.REWARDED) as string;

/** How long to wait for a rewarded ad that hasn't finished loading yet. */
const LOAD_WAIT_MS = 5000;

let initialized = false;
let rewarded: RewardedAd | null = null;
let rewardedLoaded = false;

function loadRewarded() {
  const ad = RewardedAd.createForAdRequest(rewardedUnitId);
  rewarded = ad;
  rewardedLoaded = false;
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    if (rewarded === ad) rewardedLoaded = true;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    // No fill / offline. Retry later so the next extra scan has one ready.
    if (rewarded === ad && !rewardedLoaded) setTimeout(loadRewarded, 60_000);
  });
  ad.load();
}

export async function initAds() {
  if (initialized) return;
  initialized = true;
  await mobileAds().initialize();
  loadRewarded();
}

async function waitForRewarded(): Promise<boolean> {
  const deadline = Date.now() + LOAD_WAIT_MS;
  while (!rewardedLoaded && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
  }
  return rewardedLoaded;
}

export type RewardedOutcome = "earned" | "skipped" | "unavailable";

/**
 * Shows the preloaded rewarded video. "unavailable" (no fill, ad blocker,
 * offline) should be treated as a free pass — never punish users because
 * AdMob had nothing to show.
 */
export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (!initialized || !(await waitForRewarded()) || !rewarded) return "unavailable";

  const ad = rewarded;
  return new Promise((resolve) => {
    let earned = false;
    const cleanups: Array<() => void> = [];
    const finish = (outcome: RewardedOutcome) => {
      cleanups.forEach((c) => c());
      loadRewarded();
      resolve(outcome);
    };

    cleanups.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
    cleanups.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? "earned" : "skipped")));
    cleanups.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(earned ? "earned" : "unavailable")));

    ad.show().catch(() => finish("unavailable"));
  });
}
