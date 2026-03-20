"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import type { SearchFilterState } from "./SearchFilters";
import styles from "./SavedSearches.module.css";

const STORAGE_KEY = "saved_searches";
const MAX_SAVED = 10;

export interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilterState;
  savedAt: number;
}

// ── localStorage helpers ───────────────────────────────────────────────────

function loadSaved(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

function persistSaved(items: SavedSearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

// ── Cross-tab sync via custom event ───────────────────────────────────────

const CHANGE_EVENT = "saved-searches-change";

function dispatchChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useSavedSearches() {
  const [saved, setSaved] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
    const handler = () => setSaved(loadSaved());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  function save(query: string, filters: SearchFilterState) {
    setSaved((prev) => {
      const sig = JSON.stringify({ query, filters });
      const deduped = prev.filter(
        (s) => JSON.stringify({ query: s.query, filters: s.filters }) !== sig
      );
      const next: SavedSearch[] = [
        { id: crypto.randomUUID(), query, filters, savedAt: Date.now() },
        ...deduped,
      ].slice(0, MAX_SAVED);
      persistSaved(next);
      dispatchChange();
      return next;
    });
  }

  function remove(id: string) {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSaved(next);
      dispatchChange();
      return next;
    });
  }

  return { saved, save, remove };
}

// ── SaveSearchButton ───────────────────────────────────────────────────────

interface SaveSearchButtonProps {
  query: string;
  filters: SearchFilterState;
  onSave?: () => void;
}

export function SaveSearchButton({ query, filters, onSave }: SaveSearchButtonProps) {
  const { saved, save } = useSavedSearches();

  if (!query.trim()) return null;

  const count = saved.length;
  const isSaved = saved.some(
    (s) =>
      JSON.stringify({ query: s.query, filters: s.filters }) ===
      JSON.stringify({ query, filters })
  );

  function handleClick() {
    save(query, filters);
    onSave?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSaved ? "Search already saved" : "Save this search"}
      title={isSaved ? "Already saved" : "Save this search"}
      className={`${styles.saveBtn} ${isSaved ? styles.saveBtnActive : ""}`}
    >
      <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>
  );
}

// ── SavedSearchesPanel ─────────────────────────────────────────────────────

interface SavedSearchesPanelProps {
  onSelect: (query: string, filters: SearchFilterState) => void;
}

export function SavedSearchesPanel({ onSelect }: SavedSearchesPanelProps) {
  const { saved, remove } = useSavedSearches();

  if (saved.length === 0) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <Bookmark size={12} color="var(--color-accent)" fill="var(--color-accent)" />
        <p className={styles.panelLabel}>Saved searches</p>
      </div>
      <div className={styles.itemList}>
        {saved.map((s) => (
          <SavedSearchItem key={s.id} item={s} onSelect={onSelect} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

// ── SavedSearchItem ────────────────────────────────────────────────────────

function filterSummary(filters: SearchFilterState): string {
  const parts: string[] = [];
  if (filters.type !== "all") parts.push(filters.type);
  if (filters.date !== "any") {
    const map: Record<string, string> = {
      today: "Today",
      week: "This week",
      month: "This month",
    };
    parts.push(map[filters.date] ?? filters.date);
  }
  if (filters.tags.length > 0) parts.push(filters.tags.map((t) => `#${t}`).join(" "));
  return parts.join(" · ");
}

interface SavedSearchItemProps {
  item: SavedSearch;
  onSelect: (query: string, filters: SearchFilterState) => void;
  onRemove: (id: string) => void;
}

function SavedSearchItem({ item, onSelect, onRemove }: SavedSearchItemProps) {
  const summary = filterSummary(item.filters);

  return (
    <div className={styles.item}>
      <button
        type="button"
        className={styles.itemBtn}
        onClick={() => onSelect(item.query, item.filters)}
      >
        <p className={styles.itemQuery}>{item.query}</p>
        {summary && <p className={styles.itemSummary}>{summary}</p>}
      </button>

      <button
        type="button"
        aria-label="Delete saved search"
        className={styles.deleteBtn}
        onClick={() => onRemove(item.id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
