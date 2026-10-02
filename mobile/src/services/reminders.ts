import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";
import type { GardenPlant } from "@/types/plant";
import { listPlants } from "./storage";
import { daysSinceWatered, nextFeedDate, nextWaterDate } from "./watering";

const HOUR_KEY = "plantapp.reminder_hour";
const DEFAULT_HOUR = 9;
const CHANNEL_ID = "watering";

export const REMINDER_HOURS = [7, 9, 12, 18, 20];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupReminderChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18n.t("reminders.channel"),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getReminderHour(): Promise<number> {
  const raw = await AsyncStorage.getItem(HOUR_KEY);
  const hour = raw ? Number(raw) : DEFAULT_HOUR;
  return Number.isInteger(hour) ? hour : DEFAULT_HOUR;
}

export async function setReminderHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(HOUR_KEY, String(hour));
  await rescheduleAllReminders();
}

export async function hasReminderPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Asks only if the OS still lets us; returns whether reminders can be shown. */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

function waterId(plantId: string) {
  return `water-${plantId}`;
}

function feedId(plantId: string) {
  return `feed-${plantId}`;
}

/**
 * Fires on the due day at the user's reminder hour. If that moment has
 * already passed (overdue, or due today but after the hour), it nudges at the
 * next reminder hour instead — never in the middle of the night.
 */
function reminderDate(dueDay: Date, hour: number): Date {
  const due = new Date(dueDay);
  due.setHours(hour, 0, 0, 0);

  const now = new Date();
  if (due > now) return due;

  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

async function scheduleOne(plant: GardenPlant, hour: number) {
  const days = daysSinceWatered(plant);
  await Notifications.scheduleNotificationAsync({
    identifier: waterId(plant.id),
    content: {
      title: i18n.t("reminders.title", { name: plant.name }),
      body: days > 0 ? i18n.t("reminders.body", { count: days }) : i18n.t("reminders.bodyNoDays"),
      data: { url: `/plant/${plant.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate(nextWaterDate(plant), hour),
      channelId: CHANNEL_ID,
    },
  });

  const feedDay = nextFeedDate(plant);
  if (!feedDay) return;
  await Notifications.scheduleNotificationAsync({
    identifier: feedId(plant.id),
    content: {
      title: i18n.t("reminders.feedTitle", { name: plant.name }),
      body: i18n.t("reminders.feedBody"),
      data: { url: `/plant/${plant.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate(feedDay, hour),
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleReminder(plant: GardenPlant) {
  if (!(await hasReminderPermission())) return;
  await cancelReminder(plant.id);
  await scheduleOne(plant, await getReminderHour());
}

export async function cancelReminder(plantId: string) {
  await Notifications.cancelScheduledNotificationAsync(waterId(plantId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(feedId(plantId)).catch(() => {});
}

/** Source of truth is the plants table; this rebuilds every reminder from it. */
export async function rescheduleAllReminders() {
  if (!(await hasReminderPermission())) return;
  const [plants, hour] = await Promise.all([listPlants(), getReminderHour()]);
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const plant of plants) {
    await scheduleOne(plant, hour);
  }
}

export function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" });
}

/** Tapping a watering reminder opens that plant, even from a cold start. */
export function useReminderTaps() {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const url = lastResponse?.notification.request.content.data?.url;
    if (typeof url === "string") {
      router.push(url as never);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  }, [lastResponse, router]);
}
