import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "plantapp.scan_usage";

/** Scans per day with no ad at all. */
export const FREE_SCANS_PER_DAY = Number(process.env.EXPO_PUBLIC_FREE_SCANS_PER_DAY || 2);
/** Hard ceiling; scans between FREE and CAP each need a rewarded video. */
export const DAILY_SCAN_CAP = Number(process.env.EXPO_PUBLIC_DAILY_SCAN_CAP || 15);

interface Usage {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readUsage(): Promise<Usage> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { date: today(), count: 0 };
  const parsed: Usage = JSON.parse(raw);
  return parsed.date === today() ? parsed : { date: today(), count: 0 };
}

export interface ScanAllowance {
  used: number;
  /** Scans left today that need no video. */
  freeLeft: number;
  /** Scans left today in total (free + video-unlocked). */
  totalLeft: number;
  /** True when the next scan needs a rewarded video. */
  nextNeedsAd: boolean;
}

/**
 * The monetization policy in one place: FREE_SCANS_PER_DAY free, then one
 * short opt-in video per extra scan. The server (dailyScanCap.ts) enforces the
 * ceiling; this mirror only lets the UI explain it up front.
 */
export async function getScanAllowance(): Promise<ScanAllowance> {
  const { count } = await readUsage();
  const totalLeft = Math.max(0, DAILY_SCAN_CAP - count);
  const freeLeft = Math.min(totalLeft, Math.max(0, FREE_SCANS_PER_DAY - count));
  return { used: count, freeLeft, totalLeft, nextNeedsAd: totalLeft > 0 && freeLeft === 0 };
}

export async function recordScanUsed(): Promise<void> {
  const usage = await readUsage();
  usage.count += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(usage));
}
