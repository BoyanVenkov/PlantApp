import type { ComponentType } from "react";

/** Web preview: crash reporting is for the phone apps only. */
export function initMonitoring(): void {}

export function withMonitoring(Root: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
  return Root;
}
