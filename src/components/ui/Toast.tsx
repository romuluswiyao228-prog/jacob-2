import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import styles from "./Toast.module.css";

type ToastVariant = "info" | "success" | "error";

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              styles.toast,
              t.variant === "success" ? styles.success : "",
              t.variant === "error" ? styles.error : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.message}>{t.message}</span>
            <button
              className={styles.close}
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
