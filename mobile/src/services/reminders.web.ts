import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";
import type { GardenPlant } from "@/types/plant";

/** Web preview: scheduled notifications are mobile-only, so these are no-ops. */

const HOUR_KEY = "plantapp.reminder_hour";
const DEFAULT_HOUR = 9;

export const REMINDER_HOURS = [7, 9, 12, 18, 20];

export async function setupReminderChannel() {}

export async function getReminderHour(): Promise<number> {
  const raw = await AsyncStorage.getItem(HOUR_KEY);
  const hour = raw ? Number(raw) : DEFAULT_HOUR;
  return Number.isInteger(hour) ? hour : DEFAULT_HOUR;
}

export async function setReminderHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(HOUR_KEY, String(hour));
}

export async function hasReminderPermission(): Promise<boolean> {
  return false;
}

export async function ensureReminderPermission(): Promise<boolean> {
  return false;
}

export async function scheduleReminder(_plant: GardenPlant) {}

export async function cancelReminder(_plantId: string) {}

export async function rescheduleAllReminders() {}

export function useReminderTaps() {}

export function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" });
}
