"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "var(--color-accent)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        alignItems: "center",
      }}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          const color = COLORS[t.type];
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: "var(--color-surface)",
                border: `1px solid ${color}`,
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text)",
                pointerEvents: "all",
                minWidth: 200,
                maxWidth: 340,
                animation: "slideUp 0.2s ease",
              }}
            >
              <Icon size={15} color={color} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  );
}
