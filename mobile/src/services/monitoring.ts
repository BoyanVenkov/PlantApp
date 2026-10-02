import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Crash and error reports via Sentry. Off until EXPO_PUBLIC_SENTRY_DSN is
 * set, and never in development builds. Reports carry the device model, OS,
 * app version and stack trace — no photos, plant data, or IP-based user info.
 */
export function initMonitoring(): void {
  if (!dsn) return;
  Sentry.init({ dsn, enabled: !__DEV__, sendDefaultPii: false, tracesSampleRate: 0 });
}

/** Wraps the root component so render crashes are reported too. */
export function withMonitoring(Root: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
  return dsn ? Sentry.wrap(Root) : Root;
}
