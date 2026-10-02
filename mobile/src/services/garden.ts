import type { GardenPlant, ScanRecord } from "@/types/plant";
import { addPlant, deletePlant, updatePlant } from "./storage";
import { cancelReminder, ensureReminderPermission, scheduleReminder } from "./reminders";
import { daysFromToday, suggestedFeedInterval, suggestedInterval } from "./watering";

/**
 * My Plants actions. Every change to a plant goes through here so its
 * reminder is always rescheduled alongside the database write.
 */

export type LastWatered = "today" | "few_days_ago" | "needs_water";

export async function addScanToMyPlants(
  scan: ScanRecord,
  lastWatered: LastWatered
): Promise<{ plant: GardenPlant; remindersOn: boolean }> {
  const interval = suggestedInterval(scan.analysis.care.water.intervalDays);

  const daysAgo = lastWatered === "today" ? 0 : lastWatered === "few_days_ago" ? Math.floor(interval / 2) : interval;
  const lastWateredAt = new Date();
  lastWateredAt.setDate(lastWateredAt.getDate() - daysAgo);

  const plant = await addPlant({
    scanId: scan.id,
    name: scan.analysis.identification.commonName,
    scientificName: scan.analysis.identification.scientificName,
    imageUri: scan.imageUris[0],
    waterIntervalDays: interval,
    lastWateredAt: lastWateredAt.toISOString(),
    snoozedUntil: null,
    petSafety: scan.analysis.care.petSafety ?? null,
    fertilizeIntervalDays: suggestedFeedInterval(scan.analysis.care.fertilizeIntervalDays),
    lastFertilizedAt: null,
  });

  const remindersOn = await ensureReminderPermission();
  if (remindersOn) await scheduleReminder(plant);
  return { plant, remindersOn };
}

export async function markWatered(plantId: string): Promise<GardenPlant | null> {
  const plant = await updatePlant(plantId, { lastWateredAt: new Date().toISOString(), snoozedUntil: null });
  if (plant) await scheduleReminder(plant);
  return plant;
}

/** Days a "Not yet, soil's still wet" pushes the next watering back. */
export const SNOOZE_DAYS = 2;

export async function snoozeWatering(plantId: string): Promise<GardenPlant | null> {
  const plant = await updatePlant(plantId, { snoozedUntil: daysFromToday(SNOOZE_DAYS) });
  if (plant) await scheduleReminder(plant);
  return plant;
}

export async function markFertilized(plantId: string): Promise<GardenPlant | null> {
  const plant = await updatePlant(plantId, { lastFertilizedAt: new Date().toISOString() });
  if (plant) await scheduleReminder(plant);
  return plant;
}

/** null turns fertilizing reminders off. */
export async function setFeedInterval(plantId: string, days: number | null): Promise<GardenPlant | null> {
  const fertilizeIntervalDays = days === null ? null : Math.min(90, Math.max(7, days));
  const plant = await updatePlant(plantId, { fertilizeIntervalDays });
  if (plant) await scheduleReminder(plant);
  return plant;
}

export async function setWaterInterval(plantId: string, days: number): Promise<GardenPlant | null> {
  const plant = await updatePlant(plantId, { waterIntervalDays: Math.min(60, Math.max(1, days)) });
  if (plant) await scheduleReminder(plant);
  return plant;
}

export async function renamePlant(plantId: string, name: string): Promise<GardenPlant | null> {
  const plant = await updatePlant(plantId, { name: name.trim() });
  if (plant) await scheduleReminder(plant);
  return plant;
}

export async function removeFromMyPlants(plantId: string): Promise<void> {
  await cancelReminder(plantId);
  await deletePlant(plantId);
}
