import { File } from "expo-file-system";
import type { PlantAnalysis } from "@/types/plant";
import { getDeviceId } from "./deviceId";
import { isPro } from "./subscriptions";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8787";

export class DailyLimitReachedError extends Error {
  constructor(public limit: number) {
    super(`Daily free scan limit of ${limit} reached.`);
    this.name = "DailyLimitReachedError";
  }
}

async function toBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

export async function analyzePlant(imageUris: string[]): Promise<PlantAnalysis> {
  const [images, deviceId, pro] = await Promise.all([
    Promise.all(imageUris.map(toBase64)),
    getDeviceId(),
    isPro(),
  ]);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
      "X-Pro-Entitlement": String(pro),
    },
    body: JSON.stringify({ images }),
  });

  if (response.status === 429) {
    const body = await response.json().catch(() => ({ limit: 0 }));
    throw new DailyLimitReachedError(body.limit ?? 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Analysis failed (${response.status}).`);
  }

  return response.json();
}
