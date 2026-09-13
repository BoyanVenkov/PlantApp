import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "plantapp.scan_usage";
const FREE_SCANS_PER_DAY = Number(process.env.EXPO_PUBLIC_FREE_SCANS_PER_DAY || 5);

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

/**
 * Client-side mirror of the server's cap, purely so the UI can show
 * "2 of 5 free scans left today" and block the capture button proactively
 * instead of letting the user shoot a photo just to hit a 429. The server
 * (server/src/middleware/freeScanLimit.ts) is the real enforcement point.
 */
export async function getRemainingFreeScans(): Promise<number> {
  const usage = await readUsage();
  return Math.max(0, FREE_SCANS_PER_DAY - usage.count);
}

export async function recordScanUsed(): Promise<void> {
  const usage = await readUsage();
  usage.count += 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(usage));
}

export const freeScansPerDay = FREE_SCANS_PER_DAY;
