/** Web preview: AdMob is mobile-only, so there are no ads in the browser. */

export const bannerUnitId = "";

export async function initAds() {}

export type RewardedOutcome = "earned" | "skipped" | "unavailable";

/** "unavailable" is already treated as a free pass by the scan limiter. */
export async function showRewardedAd(): Promise<RewardedOutcome> {
  return "unavailable";
}
