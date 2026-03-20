"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

type Priority = "low" | "medium" | "high" | "urgent";

const OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "#6b7280" },
  { value: "medium", label: "Medium", color: "#6366f1" },
  { value: "high",   label: "High",   color: "#f97316" },
  { value: "urgent", label: "Urgent", color: "#ef4444" },
];

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (v: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
          background: "var(--color-surface-2)",
          color: "var(--color-text)",
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />
          {selected.label}
        </span>
        <ChevronDown size={14} color="var(--color-text-muted)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          overflow: "hidden",
          zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                border: "none",
                background: value === opt.value ? "var(--color-surface-2)" : "transparent",
                color: value === opt.value ? "var(--color-text)" : "var(--color-text-muted)",
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = value === opt.value ? "var(--color-surface-2)" : "transparent"; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{opt.label}</span>
              {value === opt.value && <span style={{ color: "var(--color-accent)", fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
