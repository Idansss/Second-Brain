"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PenLine,
  BookOpen,
  Search,
  CheckSquare,
  FolderOpen,
  Network,
  Sparkles,
  Settings,
  Plus,
  Download,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: "Navigate" | "Actions" | "Quick Search";
  shortcut?: string;
  action: () => void;
}

// ---------------------------------------------------------------------------
// Fuzzy filter helper
// ---------------------------------------------------------------------------

function fuzzyMatch(needle: string, haystack: string): boolean {
  if (!needle) return true;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let ni = 0;
  for (let i = 0; i < h.length && ni < n.length; i++) {
    if (h[i] === n[ni]) ni++;
  }
  return ni === n.length;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── tRPC: fetch notes when query is long enough ─────────────────────────
  const { data: noteResults } = trpc.notes.list.useQuery(
    { limit: 5 },
    { enabled: open && query.length >= 2 }
  );

  // ── Open / close helpers ─────────────────────────────────────────────────
  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // ── Global keyboard shortcut + custom event ──────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            closePalette();
            return false;
          }
          openPalette();
          return true;
        });
      }
    };

    const onCustomEvent = () => openPalette();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("openCommandPalette", onCustomEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("openCommandPalette", onCustomEvent);
    };
  }, [openPalette, closePalette]);

  // ── Focus input when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // slight delay so the modal is rendered before we focus
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Static commands ──────────────────────────────────────────────────────
  const staticCommands: Command[] = [
    // Navigate
    {
      id: "nav-capture",
      label: "Go to Capture",
      icon: <PenLine size={15} />,
      category: "Navigate",
      shortcut: "C",
      action: () => { router.push("/capture"); closePalette(); },
    },
    {
      id: "nav-notes",
      label: "Go to Notes",
      icon: <BookOpen size={15} />,
      category: "Navigate",
      action: () => { router.push("/notes"); closePalette(); },
    },
    {
      id: "nav-search",
      label: "Go to Search",
      icon: <Search size={15} />,
      category: "Navigate",
      action: () => { router.push("/search"); closePalette(); },
    },
    {
      id: "nav-tasks",
      label: "Go to Tasks",
      icon: <CheckSquare size={15} />,
      category: "Navigate",
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "nav-collections",
      label: "Go to Collections",
      icon: <FolderOpen size={15} />,
      category: "Navigate",
      action: () => { router.push("/collections"); closePalette(); },
    },
    {
      id: "nav-knowledge",
      label: "Go to Knowledge",
      icon: <Network size={15} />,
      category: "Navigate",
      action: () => { router.push("/entities"); closePalette(); },
    },
    {
      id: "nav-digest",
      label: "Go to Digest",
      icon: <Sparkles size={15} />,
      category: "Navigate",
      action: () => { router.push("/digest"); closePalette(); },
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      icon: <Settings size={15} />,
      category: "Navigate",
      action: () => { router.push("/settings"); closePalette(); },
    },
    // Actions
    {
      id: "action-new-note",
      label: "New Note",
      icon: <Plus size={15} />,
      category: "Actions",
      shortcut: "N",
      action: () => { router.push("/capture"); closePalette(); },
    },
    {
      id: "action-new-task",
      label: "New Task",
      icon: <CheckSquare size={15} />,
      category: "Actions",
      shortcut: "T",
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "action-export",
      label: "Export Notes",
      icon: <Download size={15} />,
      category: "Actions",
      action: () => {
        closePalette();
        // Trigger a basic JSON export of notes by navigating to the notes page
        router.push("/notes?export=1");
      },
    },
  ];

  // ── Filtered static commands ─────────────────────────────────────────────
  const filteredStatic = staticCommands.filter((cmd) =>
    fuzzyMatch(query, cmd.label)
  );

  // ── Note quick-search results ────────────────────────────────────────────
  const noteCommands: Command[] = query.length >= 2 && noteResults
    ? noteResults
        .filter((note) =>
          fuzzyMatch(query, note.content?.slice(0, 200) ?? "") ||
          fuzzyMatch(query, note.sourceTitle ?? "")
        )
        .slice(0, 5)
        .map((note) => ({
          id: `note-${note.id}`,
          label: note.sourceTitle ?? note.content?.slice(0, 60) ?? "Untitled",
          icon: <ArrowRight size={15} />,
          category: "Quick Search" as const,
          action: () => { router.push(`/notes/${note.id}`); closePalette(); },
        }))
    : [];

  // ── All visible commands ─────────────────────────────────────────────────
  const allCommands: Command[] = [...filteredStatic, ...noteCommands];

  // Reset active index when list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ── Keyboard navigation inside modal ────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closePalette();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      allCommands[activeIndex]?.action();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Group commands by category ───────────────────────────────────────────
  const categories = Array.from(new Set(allCommands.map((c) => c.category)));

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closePalette}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "min(600px, calc(100vw - 32px))",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: "60vh",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <Search size={16} color="var(--color-text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 15,
              color: "var(--color-text)",
              caretColor: "var(--color-accent)",
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              padding: "2px 6px",
              fontFamily: "monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          style={{
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {allCommands.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: 14,
              }}
            >
              No commands found
            </div>
          ) : (
            categories.map((category) => {
              const cmds = allCommands.filter((c) => c.category === category);
              if (cmds.length === 0) return null;
              return (
                <div key={category}>
                  {/* Category header */}
                  <div
                    style={{
                      padding: "8px 16px 4px",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {category}
                  </div>

                  {cmds.map((cmd) => {
                    const globalIndex = allCommands.indexOf(cmd);
                    const isActive = globalIndex === activeIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onClick={cmd.action}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "9px 16px",
                          border: "none",
                          background: isActive
                            ? "var(--color-surface-2)"
                            : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          color: isActive
                            ? "var(--color-text)"
                            : "var(--color-text-muted)",
                          fontSize: 14,
                          borderRadius: 0,
                          transition: "background 0.1s",
                        }}
                      >
                        {/* Icon */}
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 6,
                            background: isActive
                              ? "var(--color-background)"
                              : "transparent",
                            color: isActive
                              ? "var(--color-accent)"
                              : "var(--color-text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          {cmd.icon}
                        </span>

                        {/* Label */}
                        <span style={{ flex: 1 }}>{cmd.label}</span>

                        {/* Shortcut hint */}
                        {cmd.shortcut && (
                          <kbd
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-muted)",
                              background: "var(--color-surface-2)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 4,
                              padding: "2px 6px",
                              fontFamily: "monospace",
                            }}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "8px 16px",
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          {[
            { keys: ["↑", "↓"], label: "navigate" },
            { keys: ["↵"], label: "select" },
            { keys: ["ESC"], label: "close" },
          ].map(({ keys, label }) => (
            <span
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "var(--color-text-muted)",
              }}
            >
              {keys.map((k) => (
                <kbd
                  key={k}
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  {k}
                </kbd>
              ))}
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
