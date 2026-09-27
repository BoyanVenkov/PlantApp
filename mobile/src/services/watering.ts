import type { GardenPlant } from "@/types/plant";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The calendar day the plant is next due (local midnight). */
export function nextWaterDate(plant: GardenPlant): Date {
  const d = startOfDay(new Date(plant.lastWateredAt));
  d.setDate(d.getDate() + plant.waterIntervalDays);
  return d;
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
  if (days < 0) {
    const n = -days;
    return { label: `Overdue by ${n} day${n === 1 ? "" : "s"}`, urgency: "overdue" };
  }
  if (days === 0) return { label: "Water today", urgency: "today" };
  if (days === 1) return { label: "Water tomorrow", urgency: "soon" };
  return { label: `Water in ${days} days`, urgency: "fine" };
}

export function needsWaterToday(plant: GardenPlant): boolean {
  return daysUntilWater(plant) <= 0;
}

/** Fallback when a scan predates intervalDays or the model returned something silly. */
export function suggestedInterval(intervalDays: number | undefined): number {
  if (!intervalDays || !Number.isFinite(intervalDays)) return 7;
  return Math.min(60, Math.max(1, Math.round(intervalDays)));
}
