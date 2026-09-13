import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";

const KEY = "plantapp.device_id";
let cached: string | null = null;

/**
 * A stable per-install anonymous id, used only to enforce the free daily
 * scan cap server-side. Not tied to any personal info.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const id = randomUUID();
  await SecureStore.setItemAsync(KEY, id);
  cached = id;
  return id;
}
