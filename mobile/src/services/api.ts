import type { PlantAnalysis } from "@/types/plant";
import { getDeviceId } from "./deviceId";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8787";

export class DailyLimitReachedError extends Error {
  constructor(public limit: number) {
    super(`Daily scan limit of ${limit} reached.`);
    this.name = "DailyLimitReachedError";
  }
}

/** @param images base64 JPEGs, already resized by prepareImage(). */
export async function analyzePlant(images: string[]): Promise<PlantAnalysis> {
  const deviceId = await getDeviceId();

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
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
