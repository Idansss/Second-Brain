"use client";

import { X } from "lucide-react";
import styles from "./SearchFilters.module.css";

export type NoteTypeFilter = "all" | "text" | "link" | "task" | "voice" | "meeting" | "file" | "highlight";
export type DateFilter = "any" | "today" | "week" | "month";

export interface SearchFilterState {
  type: NoteTypeFilter;
  date: DateFilter;
  tags: string[];
}

export const DEFAULT_FILTERS: SearchFilterState = {
  type: "all",
  date: "any",
  tags: [],
};

export function hasActiveFilters(f: SearchFilterState): boolean {
  return f.type !== "all" || f.date !== "any" || f.tags.length > 0;
}

interface SearchFiltersProps {
  filters: SearchFilterState;
  onChange: (f: SearchFilterState) => void;
  availableTags: string[];
}

const TYPE_OPTIONS: { label: string; value: NoteTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Notes", value: "text" },
  { label: "Tasks", value: "task" },
  { label: "Links", value: "link" },
];

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "Any time", value: "any" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
];

export function SearchFilters({ filters, onChange, availableTags }: SearchFiltersProps) {
  const active = hasActiveFilters(filters);

  function setType(v: NoteTypeFilter) {
    onChange({ ...filters, type: v });
  }

  function setDate(v: DateFilter) {
    onChange({ ...filters, date: v });
  }

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: next });
  }

  function clearAll() {
    onChange(DEFAULT_FILTERS);
  }

  return (
    <div className={styles.bar}>
      {/* Type chips */}
      <div className={styles.group}>
        {TYPE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={filters.type === opt.value}
            onClick={() => setType(opt.value)}
          />
        ))}
      </div>

      <div className={styles.divider} />

      {/* Date chips */}
      <div className={styles.group}>
        {DATE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={filters.date === opt.value}
            onClick={() => setDate(opt.value)}
          />
        ))}
      </div>

      {/* Tag chips */}
      {availableTags.length > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.tagsGroup}>
            {availableTags.slice(0, 5).map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                active={filters.tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                removable={filters.tags.includes(tag)}
                onRemove={() => toggleTag(tag)}
              />
            ))}
          </div>
        </>
      )}

      {/* Clear all */}
      {active && (
        <button type="button" className={styles.clearAll} onClick={clearAll}>
          <X size={12} />
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ── Internal primitives ────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
  removable,
  onRemove,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
    >
      {label}
      {removable && onRemove && (
        <span
          role="button"
          tabIndex={-1}
          aria-label={`Remove ${label} filter`}
          className={styles.chipRemove}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={10} />
        </span>
      )}
    </button>
  );
}
