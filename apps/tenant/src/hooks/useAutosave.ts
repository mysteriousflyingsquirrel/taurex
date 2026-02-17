import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutosaveOptions<T> {
  /** The data object to watch */
  data: T;
  /** Async save function. Receives the current data. */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms. Default 1500. */
  delay?: number;
  /** Set to false to disable autosave (e.g. during initial create). */
  enabled?: boolean;
}

interface UseAutosaveReturn {
  /** True while a save is in progress */
  saving: boolean;
  /** True for a short time after a successful save */
  saved: boolean;
  /** Error message if last save failed */
  error: string | null;
  /** Trigger an immediate save */
  saveNow: () => void;
}

export function useAutosave<T>({
  data,
  onSave,
  delay = 1500,
  enabled = true,
}: UseAutosaveOptions<T>): UseAutosaveReturn {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const dataRef = useRef(data);
  dataRef.current = data;

  // Initialize snapshot on mount (or when enabled changes)
  useEffect(() => {
    if (enabled) {
      snapshotRef.current = JSON.stringify(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const doSave = useCallback(async () => {
    const current = JSON.stringify(dataRef.current);
    if (current === snapshotRef.current) return;

    setSaving(true);
    setError(null);
    try {
      await onSaveRef.current(dataRef.current);
      snapshotRef.current = JSON.stringify(dataRef.current);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced auto-save on data changes
  useEffect(() => {
    if (!enabled) return;
    const current = JSON.stringify(data);
    if (current === snapshotRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, enabled, doSave]);

  // Save on beforeunload if dirty
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      const current = JSON.stringify(dataRef.current);
      if (current !== snapshotRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    doSave();
  }, [doSave]);

  return { saving, saved, error, saveNow };
}
