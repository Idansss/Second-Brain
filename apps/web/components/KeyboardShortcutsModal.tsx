"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Keyboard } from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const SHORTCUT_CATEGORIES = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["G", "N"], description: "Go to Notes" },
      { keys: ["G", "S"], description: "Go to Search" },
      { keys: ["G", "T"], description: "Go to Tasks" },
      { keys: ["G", "C"], description: "Go to Collections" },
      { keys: ["G", "A"], description: "Go to Analytics" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "↵"], description: "Save / confirm" },
      { keys: ["N"], description: "New note (on Notes page)" },
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close / cancel" },
    ],
  },
  {
    name: "Notes",
    shortcuts: [
      { keys: ["E"], description: "Edit note" },
      { keys: ["F"], description: "Focus / fullscreen mode" },
      { keys: ["P"], description: "Preview" },
    ],
  },
];

// ── Kbd badge ─────────────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 24,
        padding: "0 7px",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: 5,
        fontSize: 12,
        fontFamily: "monospace",
        color: "var(--color-text)",
        boxShadow: "0 1px 0 var(--color-border)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </kbd>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      // Don't trigger when typing in inputs
      if (tag === "input" || tag === "textarea" || target.isContentEditable) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9996,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9997,
          width: "min(680px, calc(100vw - 32px))",
          maxHeight: "85vh",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Keyboard size={18} color="var(--color-accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close shortcuts"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--color-accent)",
                  marginBottom: 12,
                }}
              >
                {category.name}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  background: "var(--color-surface-2)",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                }}
              >
                {category.shortcuts.map((s, idx) => (
                  <div
                    key={s.description}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 16px",
                      borderBottom:
                        idx < category.shortcuts.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "var(--color-text)" }}>
                      {s.description}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {s.keys.map((k, ki) => (
                        <span
                          key={ki}
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Kbd>{k}</Kbd>
                          {ki < s.keys.length - 1 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                margin: "0 1px",
                              }}
                            >
                              then
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Kbd>?</Kbd>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            to toggle this cheat sheet &nbsp;·&nbsp;
          </span>
          <Kbd>Esc</Kbd>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>to close</span>
        </div>
      </div>
    </>
  );
}
