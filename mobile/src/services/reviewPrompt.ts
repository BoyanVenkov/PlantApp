import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

/**
 * When to show the system "Rate Leafkin" dialog.
 *
 * Both stores require their own dialog (a custom "Rate us?" pop-up gets an
 * app rejected on iOS) and never tell the app whether the user rated. So we
 * can't stop asking "once rated" ourselves — the stores do it: they don't
 * show the dialog again to someone who already rated, and iOS caps it at 3
 * times a year. Our part is picking good moments and not nagging.
 */

const KEY = "plantapp.review_prompt";

/** First ask on this app open. */
const FIRST_ASK_AT_LAUNCH = 3;
/** Skipped or closed? Ask again on an open at least this many days later. */
const DAYS_BETWEEN_ASKS = 7;
/** Then stop for good. */
const MAX_ASKS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

interface PromptState {
  launches: number;
  asks: number;
  lastAskedAt: string | null;
}

async function readState(): Promise<PromptState> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as PromptState) : { launches: 0, asks: 0, lastAskedAt: null };
}

async function writeState(state: PromptState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

/** Call once per cold start. */
export async function recordLaunch(): Promise<void> {
  const state = await readState();
  state.launches += 1;
  await writeState(state);
}

function isDue(state: PromptState, now: Date): boolean {
  if (state.asks >= MAX_ASKS || state.launches < FIRST_ASK_AT_LAUNCH) return false;
  if (!state.lastAskedAt) return true;
  return now.getTime() - new Date(state.lastAskedAt).getTime() >= DAYS_BETWEEN_ASKS * DAY_MS;
}

/** Shows the store's rating dialog if it's time. Safe to call on every Home visit. */
export async function maybeAskForReview(): Promise<void> {
  const state = await readState();
  const now = new Date();
  if (!isDue(state, now) || !(await StoreReview.isAvailableAsync())) return;

  state.asks += 1;
  state.lastAskedAt = now.toISOString();
  await writeState(state);
  await StoreReview.requestReview();
}
