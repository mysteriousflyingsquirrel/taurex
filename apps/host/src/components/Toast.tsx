import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 2000);
  }, [remove]);

  const success = useCallback((msg: string) => add(msg, "success"), [add]);
  const error = useCallback((msg: string) => add(msg, "error"), [add]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const bg = toast.type === "success"
    ? "border-success/30 bg-success-bg text-success"
    : "border-destructive/30 bg-destructive-bg text-destructive";

  return (
    <div
      className={`flex min-w-[260px] max-w-sm items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 ${bg} ${visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
    >
      <span>{toast.message}</span>
      {toast.type === "error" && (
        <button
          onClick={onDismiss}
          className="ml-3 text-destructive hover:text-destructive/80"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
