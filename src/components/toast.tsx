"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PlainIcon } from "./icon";

type ToastTone = "success" | "error" | "info" | "warning";
type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  /** Auto-dismiss after this many ms; 0 = sticky. */
  ttl: number;
};

type ToastApi = {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  warning: (title: string, detail?: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, { border: string; bg: string; text: string; label: string }> = {
  success: { border: "border-positive/50", bg: "bg-positive-soft", text: "text-positive", label: "Success" },
  error: { border: "border-danger/50", bg: "bg-danger-soft", text: "text-danger", label: "Error" },
  warning: { border: "border-warning/50", bg: "bg-warning-soft", text: "text-warning", label: "Warning" },
  info: { border: "border-rule", bg: "bg-paper", text: "text-ink", label: "Note" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // Pending auto-dismiss timers, so a manual dismiss (or unmount) cancels
  // the scheduled one instead of letting it fire on a gone toast.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId.current++;
      const ttl = tone === "error" ? 6000 : 4000;
      setToasts((list) => [...list, { id, tone, title, detail, ttl }]);
      if (ttl > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), ttl),
        );
      }
    },
    [dismiss],
  );

  // Stable context value: consumers (every panel using useToast) must not
  // re-render when unrelated provider state changes.
  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
      warning: (t, d) => push("warning", t, d),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe no-op fallback so components that useToast outside the provider
    // don't crash; prefer wrapping the tree in <ToastProvider>.
    const noop = () => {};
    return {
      success: noop,
      error: noop,
      info: noop,
      warning: noop,
      dismiss: noop,
    };
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  // Announce errors via aria-live so screen readers surface them.
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
    >
      {toasts.map((t) => {
        const styles = TONE_STYLES[t.tone];
        return (
          <ToastCard
            key={t.id}
            toast={t}
            styles={styles}
            onDismiss={() => onDismiss(t.id)}
          />
        );
      })}
    </div>
  );
}

function ToastCard({
  toast,
  styles,
  onDismiss,
}: {
  toast: Toast;
  styles: { border: string; bg: string; text: string; label: string };
  onDismiss: () => void;
}) {
  // Mount animation handled by motion where the host page wraps ToastProvider
  // inside <MotionConfig>; we keep this dependency-free for portability.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto w-full max-w-sm border rounded-control shadow-pop px-4 py-3 flex items-start gap-3 transition-all duration-200 ${styles.border} ${styles.bg} ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] uppercase tracking-[0.12em] font-semibold ${styles.text}`}>
          {styles.label}
        </p>
        <p className="font-medium text-sm mt-0.5">{toast.title}</p>
        {toast.detail && (
          <p className="text-xs muted mt-1 leading-relaxed">{toast.detail}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="muted hover:text-ink shrink-0 transition-colors"
      >
        <PlainIcon name="close" size={14} />
      </button>
    </div>
  );
}
