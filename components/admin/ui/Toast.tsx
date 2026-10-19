"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Check, X, TriangleAlert } from "lucide-react";

/**
 * Confirmation that something saved, and nothing else.
 *
 * A server action that succeeds silently leaves the operator
 * wondering, and the usual fix — a full page flash — loses their
 * scroll position. One line, four seconds, dismissible.
 *
 * Announced with `role="status"` and `aria-live="polite"` so it
 * reaches a screen reader without interrupting whatever is being read.
 * Errors use `assertive`, because an error the user does not hear is
 * an error they act on as if it were a success.
 */
export interface Toast {
  id: number;
  message: string;
  tone: "ok" | "error";
}

const ToastContext = createContext<{
  show: (message: string, tone?: "ok" | "error") => void;
}>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, tone }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
        {toasts.map((toast) => (
          <ToastRow
            key={toast.id}
            toast={toast}
            onDone={() =>
              setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const error = toast.tone === "error";
  return (
    <div
      role="status"
      aria-live={error ? "assertive" : "polite"}
      className={`step-in pointer-events-auto flex items-start gap-3 rounded border px-4 py-3 text-sm shadow-[0_8px_24px_rgba(18,20,15,0.12)] ${
        error
          ? "border-oxblood bg-paper text-oxblood"
          : "on-ink border-line-dark bg-ink text-paper"
      }`}
    >
      {error ? (
        <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      ) : (
        <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDone}
        aria-label="Dismiss"
        className="-m-1 shrink-0 p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X aria-hidden="true" size={14} />
      </button>
    </div>
  );
}
