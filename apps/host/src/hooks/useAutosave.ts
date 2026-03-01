import { useEffect, useRef, useState } from "react";

interface UseAutosaveOptions<T> {
  enabled: boolean;
  isDirty: boolean;
  watch: T;
  delayMs?: number;
  saveFn: (next: T) => Promise<void>;
}

interface UseAutosaveResult {
  isAutosaving: boolean;
  lastSavedAt: number | null;
  lastError: Error | null;
}

export function useAutosave<T>({
  enabled,
  isDirty,
  watch,
  delayMs = 1500,
  saveFn,
}: UseAutosaveOptions<T>): UseAutosaveResult {
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const latestWatchRef = useRef(watch);

  latestWatchRef.current = watch;

  useEffect(() => {
    if (!enabled || !isDirty) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void runSave();
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, isDirty, watch, delayMs]);

  const runSave = async () => {
    if (!enabled || !isDirty) return;

    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }

    savingRef.current = true;
    setIsAutosaving(true);
    setLastError(null);

    try {
      await saveFn(latestWatchRef.current);
      setLastSavedAt(Date.now());
    } catch (err) {
      setLastError(err instanceof Error ? err : new Error("Autosave failed"));
    } finally {
      savingRef.current = false;
      setIsAutosaving(false);
    }

    if (queuedRef.current) {
      queuedRef.current = false;
      void runSave();
    }
  };

  return {
    isAutosaving,
    lastSavedAt,
    lastError,
  };
}
