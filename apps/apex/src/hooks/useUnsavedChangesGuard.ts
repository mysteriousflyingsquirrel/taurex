import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Guards against losing unsaved changes.
 *
 * - Browser tab close / external navigation: blocked via beforeunload
 * - In-app navigation: use `guardedNavigate(path)` instead of `navigate(path)`.
 *   If dirty, shows the DiscardChangesModal; if not, navigates immediately.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const showModal = pendingPath !== null;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) {
      setPendingPath(null);
    }
  }, [dirty]);

  const confirmDiscard = useCallback(() => {
    if (pendingPath) {
      const path = pendingPath;
      setPendingPath(null);
      navigate(path);
    }
  }, [pendingPath, navigate]);

  const cancelDiscard = useCallback(() => {
    setPendingPath(null);
  }, []);

  const guardedNavigate = useCallback(
    (to: string) => {
      if (dirty) {
        setPendingPath(to);
      } else {
        navigate(to);
      }
    },
    [dirty, navigate]
  );

  return { showModal, confirmDiscard, cancelDiscard, guardedNavigate };
}
