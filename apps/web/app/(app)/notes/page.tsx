"use client";
import { trpc } from "@/lib/trpc/client";
import { NoteCard } from "@/components/notes/NoteCard";
import { EmptyState } from "@/components/EmptyState";
import { NoteCardSkeleton } from "@/components/Skeleton";
import { Loader2, CheckSquare, Square, Archive, Trash2, X, CalendarDays } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NoteRow } from "@repo/db";
import { useRealtimeNotes } from "@/hooks/useRealtimeNotes";
import { useIsMobile } from "@/hooks/useIsMobile";

const TYPES = ["all", "text", "link", "voice", "task", "meeting"] as const;
const PAGE_SIZE = 24;

function formatDailyDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildDailyTitle(d: Date): string {
  return `Daily Note — ${formatDailyDate(d)}`;
}

function buildDailyContent(d: Date): string {
  const title = buildDailyTitle(d);
  return `# ${title}\n\n## Morning intentions\n\n## Notes & thoughts\n\n## End of day reflection\n`;
}

export default function NotesPage() {
  useRealtimeNotes();

  const router = useRouter();
  const isMobile = useIsMobile();

  const [activeType, setActiveType] = useState<typeof TYPES[number]>("all");
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [allNotes, setAllNotes] = useState<NoteRow[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Load pinned IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pinnedNoteIds");
      if (stored) setPinnedIds(JSON.parse(stored) as string[]);
    } catch {
      // ignore
    }
  }, []);

  const { data: tags } = trpc.notes.listTags.useQuery();

  const { data: page, isLoading, isFetching } = trpc.notes.list.useQuery({
    limit: PAGE_SIZE,
    offset,
    type: activeType === "all" ? undefined : activeType,
    tag: activeTag,
  });

  // When filter changes, reset accumulated notes and offset
  useEffect(() => {
    setAllNotes([]);
    setOffset(0);
  }, [activeType, activeTag]);

  // Append newly fetched page to accumulated list
  useEffect(() => {
    if (!page) return;
    if (offset === 0) {
      setAllNotes(page);
    } else {
      setAllNotes((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fresh = page.filter((n) => !existingIds.has(n.id));
        return [...prev, ...fresh];
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasMore = page ? page.length === PAGE_SIZE : false;

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("pinnedNoteIds", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ── Daily note ───────────────────────────────────────────────────────────────
  const createNote = trpc.notes.create.useMutation();

  async function openTodaysNote() {
    setDailyLoading(true);
    try {
      const today = new Date();
      const title = buildDailyTitle(today);
      // Search the already-loaded notes list for a matching daily note
      const existing = allNotes.find((n) => n.content.startsWith(`# ${title}`));
      if (existing) {
        router.push(`/notes/${existing.id}`);
        return;
      }
      // Create a fresh daily note
      const note = await createNote.mutateAsync({
        content: buildDailyContent(today),
        type: "text",
      });
      router.push(`/notes/${note.id}`);
    } finally {
      setDailyLoading(false);
    }
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();
  const archiveMutation = trpc.notes.archive.useMutation({ onSuccess: () => utils.notes.list.invalidate() });
  const deleteMutation = trpc.notes.delete.useMutation({ onSuccess: () => utils.notes.list.invalidate() });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkArchive() {
    await Promise.all([...selectedIds].map((id) => archiveMutation.mutateAsync({ id })));
    setSelectedIds(new Set());
    setSelectMode(false);
    setAllNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} note(s) permanently?`)) return;
    await Promise.all([...selectedIds].map((id) => deleteMutation.mutateAsync({ id })));
    setSelectedIds(new Set());
    setSelectMode(false);
    setAllNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
  }

  const pinnedNotes = allNotes.filter((n) => pinnedIds.includes(n.id));
  const unpinnedNotes = allNotes.filter((n) => !pinnedIds.includes(n.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
      {/* Header + type filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Notes</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{allNotes.length} notes captured</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={openTodaysNote}
            disabled={dailyLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              cursor: dailyLoading ? "not-allowed" : "pointer",
              background: "transparent",
              color: "var(--color-text-muted)",
              opacity: dailyLoading ? 0.6 : 1,
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!dailyLoading) {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.color = "var(--color-accent)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            {dailyLoading
              ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              : <CalendarDays size={13} />
            }
            Today&apos;s Note
          </button>
          <button type="button" onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
            style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, cursor: "pointer",
              borderColor: selectMode ? "var(--color-accent)" : "var(--color-border)",
              background: selectMode ? "var(--color-accent)20" : "transparent",
              color: selectMode ? "var(--color-accent)" : "var(--color-text-muted)" }}>
            {selectMode ? "Cancel select" : "Select"}
          </button>
          {TYPES.map((t) => (
            <button type="button" key={t} onClick={() => setActiveType(t)}
              style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, cursor: "pointer", transition: "all 0.15s",
                borderColor: activeType === t ? "var(--color-accent)" : "var(--color-border)",
                background: activeType === t ? "var(--color-accent)" : "transparent",
                color: activeType === t ? "white" : "var(--color-text-muted)" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "var(--color-surface)", border: "1px solid var(--color-accent)", borderRadius: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{selectedIds.size} selected</span>
          <button type="button" onClick={bulkArchive} disabled={archiveMutation.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", fontSize: 13, cursor: "pointer" }}>
            <Archive size={13} /> Archive
          </button>
          <button type="button" onClick={bulkDelete} disabled={deleteMutation.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>
            <Trash2 size={13} /> Delete
          </button>
          <button type="button" title="Clear selection" onClick={() => setSelectedIds(new Set())}
            style={{ display: "flex", alignItems: "center", padding: "6px", borderRadius: 8, border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tag filter pills */}
      {tags && tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" onClick={() => setActiveTag(undefined)}
            style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid", fontSize: 11, cursor: "pointer", transition: "all 0.15s",
              borderColor: activeTag === undefined ? "var(--color-accent)" : "var(--color-border)",
              background: activeTag === undefined ? "var(--color-accent)" : "transparent",
              color: activeTag === undefined ? "white" : "var(--color-text-muted)" }}>
            All tags
          </button>
          {tags.map((tag) => (
            <button type="button" key={tag.name} onClick={() => setActiveTag(activeTag === tag.name ? undefined : tag.name)}
              style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid", fontSize: 11, cursor: "pointer", transition: "all 0.15s",
                borderColor: activeTag === tag.name ? "var(--color-accent)" : "var(--color-border)",
                background: activeTag === tag.name ? "var(--color-accent)" : "transparent",
                color: activeTag === tag.name ? "white" : "var(--color-text-muted)" }}>
              #{tag.name} ({tag.count})
            </button>
          ))}
        </div>
      )}

      {/* Skeleton loading (first load only) */}
      {isLoading && offset === 0 && (
        <div style={{ columns: "3 300px", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ breakInside: "avoid", marginBottom: 12 }}>
              <NoteCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && allNotes.length === 0 && (
        activeTag || activeType !== "all"
          ? <EmptyState icon="🔍" title="No notes match" description="Try a different filter or clear the current selection." />
          : <EmptyState
              icon="📝"
              title="Your notes live here"
              description="Capture thoughts, links, voice memos, and ideas. They'll show up here, searchable and connected."
              action={{ label: "Capture your first note", href: "/capture" }}
              secondaryAction={{ label: "Learn what to capture", href: "/chat" }}
            />
      )}

      {/* Pinned notes section */}
      {pinnedNotes.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Pinned
          </p>
          <div style={{ columns: isMobile ? "1 100%" : "3 300px", gap: 12 }}>
            {pinnedNotes.map((note) => (
              <div key={note.id} style={{ breakInside: "avoid", marginBottom: 12, position: "relative" }}
                onClick={selectMode ? () => toggleSelect(note.id) : undefined}>
                {selectMode && (
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, pointerEvents: "none" }}>
                    {selectedIds.has(note.id) ? <CheckSquare size={16} color="var(--color-accent)" /> : <Square size={16} color="var(--color-text-muted)" />}
                  </div>
                )}
                <div style={{ opacity: selectMode && !selectedIds.has(note.id) ? 0.6 : 1, outline: selectMode && selectedIds.has(note.id) ? "2px solid var(--color-accent)" : "none", borderRadius: 10 }}>
                  <NoteCard note={note} pinned onPin={() => togglePin(note.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All (unpinned) notes */}
      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              All Notes
            </p>
          )}
          <div style={{ columns: isMobile ? "1 100%" : "3 300px", gap: 12 }}>
            {unpinnedNotes.map((note) => (
              <div key={note.id} style={{ breakInside: "avoid", marginBottom: 12, position: "relative" }}
                onClick={selectMode ? () => toggleSelect(note.id) : undefined}>
                {selectMode && (
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, pointerEvents: "none" }}>
                    {selectedIds.has(note.id) ? <CheckSquare size={16} color="var(--color-accent)" /> : <Square size={16} color="var(--color-text-muted)" />}
                  </div>
                )}
                <div style={{ opacity: selectMode && !selectedIds.has(note.id) ? 0.6 : 1, outline: selectMode && selectedIds.has(note.id) ? "2px solid var(--color-accent)" : "none", borderRadius: 10 }}>
                  <NoteCard note={note} pinned={false} onPin={() => togglePin(note.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load more / end indicator */}
      {allNotes.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24 }}>
          {hasMore ? (
            <button type="button" onClick={handleLoadMore} disabled={isFetching}
              style={{ padding: "8px 24px", borderRadius: 20, border: "1px solid var(--color-border)", fontSize: 13,
                cursor: isFetching ? "default" : "pointer", background: "transparent", color: "var(--color-text-muted)",
                display: "flex", alignItems: "center", gap: 8, opacity: isFetching ? 0.6 : 1 }}>
              {isFetching && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {isFetching ? "Loading…" : "Load more"}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No more notes</p>
          )}
        </div>
      )}
    </div>
  );
}
