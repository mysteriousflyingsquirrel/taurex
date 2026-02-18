import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

interface UseAutosaveReturn {
  saving: boolean;
  saved: boolean;
  error: string | null;
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
