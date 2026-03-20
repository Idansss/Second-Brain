"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, FileText, Link2, CheckSquare, Mic, Hash } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SearchFilters, DEFAULT_FILTERS, hasActiveFilters } from "./SearchFilters";
import type { SearchFilterState, NoteTypeFilter } from "./SearchFilters";
import { SaveSearchButton } from "./SavedSearches";
import { formatDistanceToNow } from "date-fns";

interface SearchResultsPaneProps {
  /** When set by parent, trigger a new search with this query + filters */
  initialQuery?: string;
  initialFilters?: SearchFilterState;
}

type SearchResult = {
  id: string;
  content: string;
  source_title: string | null;
  source_url: string | null;
  created_at: Date;
  type: string;
  score: number;
  match_type: "semantic" | "keyword";
};

function noteTypeToFilter(type: string): NoteTypeFilter {
  const map: Record<string, NoteTypeFilter> = {
    text: "text",
    link: "link",
    task: "task",
    voice: "voice",
    meeting: "meeting",
    file: "file",
    highlight: "highlight",
  };
  return map[type] ?? "text";
}

function NoteTypeIcon({ type }: { type: string }) {
  const props = { size: 13, color: "var(--color-text-muted)" };
  switch (type) {
    case "link":
      return <Link2 {...props} />;
    case "task":
      return <CheckSquare {...props} />;
    case "voice":
      return <Mic {...props} />;
    default:
      return <FileText {...props} />;
  }
}

export function SearchResultsPane({ initialQuery = "", initialFilters }: SearchResultsPaneProps) {
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilterState>(initialFilters ?? DEFAULT_FILTERS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when parent passes new query/filters (from saved searches or history)
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      setInputValue(initialQuery);
    }
    if (initialFilters) {
      setFilters(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialFilters]);

  // Load top tags
  const tagsQuery = trpc.notes.listTags.useQuery(undefined, {
    staleTime: 60_000,
  });
  const topTags = (tagsQuery.data ?? []).slice(0, 5).map((t) => t.name);

  // Search query — only fires when query is non-empty
  const searchQuery = trpc.notes.search.useQuery(
    {
      query: query || " ",
      limit: 20,
      type: filters.type !== "all" ? (filters.type as Exclude<NoteTypeFilter, "all">) : undefined,
      dateRange: filters.date,
      tags: filters.tags,
    },
    {
      enabled: query.trim().length > 0,
      staleTime: 15_000,
    }
  );

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = inputValue.trim();
    if (q) setQuery(q);
  }

  const results = (searchQuery.data ?? []) as SearchResult[];
  const semanticResults = results.filter((r) => r.match_type === "semantic");
  const keywordOnlyResults = results.filter((r) => r.match_type !== "semantic");

  const isActive = hasActiveFilters(filters);
  const hasQuery = query.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={16}
            color="var(--color-text-muted)"
            style={{ position: "absolute", left: 12, pointerEvents: "none" }}
          />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Search your notes..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "0 16px",
            height: 40,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "var(--color-accent)",
            color: "white",
            fontSize: 14,
            fontFamily: "inherit",
            fontWeight: 500,
            opacity: !inputValue.trim() ? 0.5 : 1,
          }}
          disabled={!inputValue.trim()}
        >
          Search
        </button>

        {/* Save search button — only when query present */}
        <SaveSearchButton query={query} filters={filters} />
      </form>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <SearchFilters
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          // Re-run immediately when filters change
          if (query.trim()) setQuery(query);
        }}
        availableTags={topTags}
      />

      {/* ── Active filter summary ────────────────────────────────────────────── */}
      {isActive && hasQuery && (
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            paddingBottom: 8,
          }}
        >
          Filtering active
          {filters.type !== "all" && ` · Type: ${filters.type}`}
          {filters.date !== "any" && ` · ${filters.date}`}
          {filters.tags.length > 0 && ` · Tags: ${filters.tags.join(", ")}`}
        </p>
      )}

      {/* ── Results area ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {/* Empty state */}
        {!hasQuery && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 280,
              gap: 10,
              color: "var(--color-text-muted)",
            }}
          >
            <Search size={32} color="var(--color-border)" />
            <p style={{ fontSize: 15, fontWeight: 500 }}>Search your knowledge base</p>
            <p style={{ fontSize: 13, textAlign: "center", maxWidth: 300 }}>
              Finds notes using semantic similarity and keyword matching.
            </p>
          </div>
        )}

        {/* Loading */}
        {hasQuery && searchQuery.isLoading && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--color-text-muted)",
              fontSize: 13,
              padding: "24px 0",
            }}
          >
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
            Searching...
          </div>
        )}

        {/* No results */}
        {hasQuery && !searchQuery.isLoading && results.length === 0 && (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              color: "var(--color-text-muted)",
              fontSize: 14,
            }}
          >
            No results for &ldquo;{query}&rdquo;
            {isActive && (
              <span style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                Try removing some filters.
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {hasQuery && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {semanticResults.length > 0 && (
              <>
                {semanticResults.map((r) => (
                  <ResultCard key={r.id} result={r} />
                ))}
              </>
            )}

            {keywordOnlyResults.length > 0 && (
              <>
                {semanticResults.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      margin: "4px 0",
                    }}
                  >
                    <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Keyword matches
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                  </div>
                )}
                {keywordOnlyResults.map((r) => (
                  <ResultCard key={r.id} result={r} showKeywordBadge />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ResultCard ─────────────────────────────────────────────────────────────

function ResultCard({
  result,
  showKeywordBadge,
}: {
  result: SearchResult;
  showKeywordBadge?: boolean;
}) {
  const title = result.source_title ?? result.content.slice(0, 80);
  const snippet =
    result.source_title
      ? result.content.slice(0, 140)
      : result.content.slice(80, 220);
  const date = result.created_at ? new Date(result.created_at) : null;

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "border-color 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-accent)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-border)")
      }
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <NoteTypeIcon type={result.type} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {showKeywordBadge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: "color-mix(in srgb, var(--color-text-muted) 12%, var(--color-surface))",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
                letterSpacing: "0.03em",
              }}
            >
              keyword
            </span>
          )}
          {date && (
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
              }}
            >
              {formatDistanceToNow(date, { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Snippet */}
      {snippet && (
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {snippet}
        </p>
      )}

      {/* Source URL */}
      {result.source_url && (
        <a
          href={result.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: "var(--color-accent)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result.source_url}
        </a>
      )}
    </div>
  );
}
