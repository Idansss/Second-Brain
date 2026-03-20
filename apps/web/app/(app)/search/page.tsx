"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/search/ChatInterface";
import { SearchResultsPane } from "@/components/search/SearchResultsPane";
import { SavedSearchesPanel } from "@/components/search/SavedSearches";
import { DEFAULT_FILTERS } from "@/components/search/SearchFilters";
import type { SearchFilterState } from "@/components/search/SearchFilters";
import { X, Clock, MessageSquare, Search } from "lucide-react";
import styles from "./page.module.css";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

const EXAMPLE_QUESTIONS = [
  "What do I know about [person]?",
  "Summarize my notes on [project]",
  "What were the key decisions last week?",
  "Have I seen this idea before?",
  "What are my open commitments?",
  "Show me everything about [topic]",
];

type ActiveTab = "chat" | "search";

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [history, setHistory] = useState<string[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | undefined>(undefined);

  // For injecting saved searches into the search results pane
  const [searchPaneQuery, setSearchPaneQuery] = useState("");
  const [searchPaneFilters, setSearchPaneFilters] = useState<SearchFilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSearch = useCallback((query: string) => {
    setHistory((prev) => {
      const deduped = [query, ...prev.filter((q) => q !== query)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
      } catch {}
      return deduped;
    });
  }, []);

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  }

  function handleHistoryChipClick(query: string) {
    if (activeTab === "search") {
      setSearchPaneQuery(query);
      setSearchPaneFilters(DEFAULT_FILTERS);
    } else {
      setPendingQuery(query);
      setTimeout(() => setPendingQuery(undefined), 100);
    }
  }

  function handleSavedSearchSelect(query: string, filters: SearchFilterState) {
    setSearchPaneQuery(query);
    setSearchPaneFilters(filters);
    setActiveTab("search");
  }

  return (
    <div className={styles.layout}>
      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className={styles.left}>
        <div className={styles.header}>
          <h1 className={styles.title}>Search & Chat</h1>
          <p className={styles.subtitle}>Ask questions about your notes, or search directly.</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "chat" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare size={14} />
            AI Chat
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "search" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <Search size={14} />
            Search
          </button>
        </div>

        {/* Tab content */}
        <div className={styles.tabContent}>
          {activeTab === "chat" && (
            <ChatInterface onSearch={handleSearch} pendingQuery={pendingQuery} />
          )}
          {activeTab === "search" && (
            <SearchResultsPane
              initialQuery={searchPaneQuery}
              initialFilters={searchPaneFilters}
            />
          )}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className={styles.right}>
        {/* Saved searches — rendered above "Try asking" */}
        <SavedSearchesPanel onSelect={handleSavedSearchSelect} />

        {/* Try asking */}
        <div className={styles.panel}>
          <p className={styles.panelLabel}>Try asking</p>
          <div className={styles.exampleList}>
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className={styles.exampleBtn}
                onClick={() => handleHistoryChipClick(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Search history */}
        {history.length > 0 && (
          <div className={styles.panel}>
            <div className={styles.historyHeader}>
              <div className={styles.historyTitle}>
                <Clock size={12} color="var(--color-text-muted)" />
                <p className={styles.historyLabel}>Recent searches</p>
              </div>
              <button type="button" className={styles.clearBtn} onClick={clearHistory}>
                <X size={10} />
                Clear
              </button>
            </div>
            <div className={styles.historyList}>
              {history.map((q) => (
                <button
                  type="button"
                  key={q}
                  className={styles.historyItem}
                  onClick={() => handleHistoryChipClick(q)}
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className={styles.panel}>
          <p className={styles.howLabel}>How it works</p>
          <div className={styles.howList}>
            {[
              ["🔍", "Your question is converted to a vector embedding"],
              ["🧠", "Most relevant notes are retrieved from your database"],
              ["💬", "Claude answers using only your own content"],
              ["📎", "Every answer cites the exact source notes"],
            ].map(([icon, text]) => (
              <div key={text as string} className={styles.howItem}>
                <span className={styles.howIcon}>{icon}</span>
                <p className={styles.howText}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
