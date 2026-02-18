import { useMemo } from "react";

/**
 * Returns true when `current` and `saved` differ (deep JSON comparison).
 * Pages own their form state; this hook just computes dirty status.
 */
export function useDirtyForm<T>(current: T, saved: T): boolean {
  return useMemo(
    () => JSON.stringify(current) !== JSON.stringify(saved),
    [current, saved]
  );
}
