import { getLocales } from "expo-localization";

/** Countries mostly south of the equator, where the seasons are flipped. */
const SOUTHERN = new Set(["AR", "AU", "BO", "BR", "BW", "CL", "LS", "MG", "MW", "MZ", "NA", "NZ", "PE", "PY", "SZ", "UY", "ZA", "ZM", "ZW"]);

let southern: boolean | null = null;

/** Guessed from the phone's region setting; no location permission needed. */
function isSouthern(): boolean {
  if (southern === null) southern = SOUTHERN.has(getLocales()[0]?.regionCode ?? "");
  return southern;
}

/** The month as if in the northern hemisphere (0 = January). */
function northernMonth(date: Date): number {
  const m = date.getMonth();
  return isSouthern() ? (m + 6) % 12 : m;
}

/** November–February: most houseplants rest, so they need less water and no feeding. */
export function isWinter(date: Date): boolean {
  const m = northernMonth(date);
  return m >= 10 || m <= 1;
}

/** March–September: the season for fertilizing. */
export function isGrowingSeason(date: Date): boolean {
  const m = northernMonth(date);
  return m >= 2 && m <= 8;
}
