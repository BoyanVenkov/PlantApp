import i18n from "@/i18n";
import type { GardenPlant } from "@/types/plant";
import { isGrowingSeason, isWinter } from "./seasons";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gemini's interval is for the growing season. Resting plants in winter use
 * far less water, and overwatering is what kills most houseplants.
 */
const WINTER_FACTOR = 1.5;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Days between waterings for a cycle starting on `from`: stretched in winter. */
export function effectiveInterval(plant: GardenPlant, from = new Date(plant.lastWateredAt)): number {
  return isWinter(from) ? Math.ceil(plant.waterIntervalDays * WINTER_FACTOR) : plant.waterIntervalDays;
}

/** The calendar day the plant is next due (local midnight). A snooze can only push it later. */
export function nextWaterDate(plant: GardenPlant): Date {
  const d = startOfDay(new Date(plant.lastWateredAt));
  d.setDate(d.getDate() + effectiveInterval(plant));
  if (plant.snoozedUntil) {
    const snoozed = startOfDay(new Date(plant.snoozedUntil));
    if (snoozed > d) return snoozed;
  }
  return d;
}

/** `days` from today, as the ISO timestamp a snooze is stored as. */
export function daysFromToday(days: number): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Next feeding day, or null when fertilizing reminders are off. A date that
 * falls outside the growing season waits for spring instead.
 */
export function nextFeedDate(plant: GardenPlant): Date | null {
  if (!plant.fertilizeIntervalDays) return null;
  const d = startOfDay(new Date(plant.lastFertilizedAt ?? plant.createdAt));
  d.setDate(d.getDate() + plant.fertilizeIntervalDays);
  for (let i = 0; i < 12 && !isGrowingSeason(d); i++) d.setMonth(d.getMonth() + 1, 1);
  return d;
}

/** null for plants that shouldn't be fed; 30 days when an older scan didn't say. */
export function suggestedFeedInterval(days: number | undefined): number | null {
  if (days === 0) return null;
  if (!days || !Number.isFinite(days)) return 30;
  return Math.min(90, Math.max(7, Math.round(days)));
}

/** Whole days until due: 0 = today, negative = overdue. */
export function daysUntilWater(plant: GardenPlant, now = new Date()): number {
  return Math.round((nextWaterDate(plant).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function daysSinceWatered(plant: GardenPlant, now = new Date()): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(new Date(plant.lastWateredAt)).getTime()) / DAY_MS);
}

export type WaterUrgency = "overdue" | "today" | "soon" | "fine";

export function waterStatus(plant: GardenPlant): { label: string; urgency: WaterUrgency } {
  const days = daysUntilWater(plant);
  if (days < 0) return { label: i18n.t("waterStatus.overdue", { count: -days }), urgency: "overdue" };
  if (days === 0) return { label: i18n.t("waterStatus.today"), urgency: "today" };
  if (days === 1) return { label: i18n.t("waterStatus.tomorrow"), urgency: "soon" };
  return { label: i18n.t("waterStatus.inDays", { count: days }), urgency: "fine" };
}

export function needsWaterToday(plant: GardenPlant): boolean {
  return daysUntilWater(plant) <= 0;
}

/** Fallback when a scan predates intervalDays or the model returned something silly. */
export function suggestedInterval(intervalDays: number | undefined): number {
  if (!intervalDays || !Number.isFinite(intervalDays)) return 7;
  return Math.min(60, Math.max(1, Math.round(intervalDays)));
}
