"use client";

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { RotateCcw, Check, ChevronRight, Brain, Clock } from "lucide-react";

const SR_KEY = "spaced_repetition_v1";

interface SRRecord {
  lastReviewed: string;
  interval: number;
  nextReview: string;
}

type SRStore = Record<string, SRRecord>;

function loadStore(): SRStore {
  try {
    const raw = localStorage.getItem(SR_KEY);
    return raw ? (JSON.parse(raw) as SRStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: SRStore) {
  try {
    localStorage.setItem(SR_KEY, JSON.stringify(store));
  } catch {}
}

function nextReviewDate(interval: number): string {
  const d = new Date();
  d.setDate(d.getDate() + interval);
  return d.toISOString();
}

function isDue(record: SRRecord | undefined): boolean {
  if (!record) return true;
  return new Date(record.nextReview) <= new Date();
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

interface FlashcardNote {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  type: string;
}

function FlashCard({
  note,
  flipped,
  onFlip,
  onGotIt,
  onReviewAgain,
}: {
  note: FlashcardNote;
  flipped: boolean;
  onFlip: () => void;
  onGotIt: () => void;
  onReviewAgain: () => void;
}) {
  const firstKeyPoint = note.keyPoints[0] ?? "Review this note for key insights.";

  return (
    <div
      style={{
        perspective: 1000,
        width: "100%",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {/* Card flip container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: 280,
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          cursor: flipped ? "default" : "pointer",
        }}
        onClick={!flipped ? onFlip : undefined}
        role={!flipped ? "button" : undefined}
        tabIndex={!flipped ? 0 : undefined}
        onKeyDown={!flipped ? (e) => e.key === "Enter" && onFlip() : undefined}
        aria-label={!flipped ? "Flip card to see answer" : undefined}
      >
        {/* Front face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "36px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 20,
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                fontSize: 11,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              {note.type}
            </span>
          </div>
          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--color-text)",
                lineHeight: 1.3,
                marginBottom: 14,
              }}
            >
              {note.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-text-muted)",
                background: "var(--color-surface-2)",
                borderRadius: 10,
                padding: "12px 14px",
                borderLeft: "3px solid var(--color-accent)",
              }}
            >
              {firstKeyPoint}
            </p>
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "var(--color-text-muted)",
              fontSize: 12,
            }}
          >
            <ChevronRight size={13} />
            Click to reveal full answer
          </div>
        </div>

        {/* Back face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-accent)",
            borderRadius: 20,
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            overflowY: "auto",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-text)",
                marginBottom: 10,
              }}
            >
              {note.title}
            </h2>
            {note.summary && (
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--color-text)",
                  marginBottom: 14,
                }}
              >
                {note.summary}
              </p>
            )}
          </div>

          {note.keyPoints.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 10,
                }}
              >
                Key Points
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {note.keyPoints.map((point, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--color-accent)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text)" }}>
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response buttons */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: 10,
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              onClick={onReviewAgain}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
                color: "var(--color-text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.color = "#f59e0b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              <RotateCcw size={13} />
              Review again
            </button>
            <button
              type="button"
              onClick={onGotIt}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, #10b981 40%, transparent)",
                background: "color-mix(in srgb, #10b981 12%, transparent)",
                color: "#10b981",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, #10b981 20%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, #10b981 12%, transparent)";
              }}
            >
              <Check size={13} />
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const [store, setStore] = useState<SRStore>({});
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Load SR store from localStorage after mount
  useEffect(() => {
    setStore(loadStore());
    setStoreLoaded(true);
  }, []);

  const { data: allNotes, isLoading } = trpc.notes.list.useQuery(
    { limit: 100 },
    { enabled: storeLoaded }
  );

  // Build flashcard-eligible notes: must have AI-generated key points or summary
  const flashcardNotes: FlashcardNote[] = useMemo(() => {
    if (!allNotes) return [];
    const result: FlashcardNote[] = [];
    for (const note of allNotes) {
      const meta = (note.metadata ?? {}) as Record<string, unknown>;
      const summary = (meta.summary as string | undefined) ?? "";
      const keyPoints = (meta.keyPoints as string[] | undefined) ?? [];
      if (!summary && keyPoints.length === 0) continue;
      const title =
        (note as unknown as { sourceTitle?: string }).sourceTitle ??
        note.content.slice(0, 60) +
          (note.content.length > 60 ? "…" : "");
      result.push({ id: note.id, title, summary, keyPoints, type: note.type });
    }
    return result;
  }, [allNotes]);

  // Filter to only due cards
  const dueCards = useMemo(() => {
    if (!storeLoaded) return [];
    return flashcardNotes.filter((n) => isDue(store[n.id]));
  }, [flashcardNotes, store, storeLoaded]);

  // Find the earliest next-review date among non-due cards
  const nextUpcomingReview = useMemo(() => {
    if (!storeLoaded || dueCards.length > 0) return null;
    let earliest: string | null = null;
    for (const note of flashcardNotes) {
      const rec = store[note.id];
      if (rec && !isDue(rec)) {
        if (!earliest || new Date(rec.nextReview) < new Date(earliest)) {
          earliest = rec.nextReview;
        }
      }
    }
    return earliest;
  }, [flashcardNotes, store, storeLoaded, dueCards]);

  const currentCard = dueCards[currentIndex] ?? null;

  function advanceCard() {
    setFlipped(false);
    // Small delay to let flip animation reset before showing next card
    setTimeout(() => {
      setCurrentIndex((prev) => {
        // After recording, the dueCards list will update; just move to next
        return prev; // currentIndex stays; the processed card drops out of dueCards
      });
    }, 50);
  }

  function handleGotIt() {
    if (!currentCard) return;
    const current = store[currentCard.id];
    const prevInterval = current?.interval ?? 1;
    const newInterval = Math.min(prevInterval * 2, 64); // cap at 64 days
    const newRecord: SRRecord = {
      lastReviewed: new Date().toISOString(),
      interval: newInterval,
      nextReview: nextReviewDate(newInterval),
    };
    const newStore = { ...store, [currentCard.id]: newRecord };
    setStore(newStore);
    saveStore(newStore);
    advanceCard();
  }

  function handleReviewAgain() {
    if (!currentCard) return;
    const newRecord: SRRecord = {
      lastReviewed: new Date().toISOString(),
      interval: 1,
      nextReview: nextReviewDate(1),
    };
    const newStore = { ...store, [currentCard.id]: newRecord };
    setStore(newStore);
    saveStore(newStore);
    advanceCard();
  }

  // Progress info
  const totalDue = dueCards.length;
  const totalReviewed = flashcardNotes.filter(
    (n) => store[n.id] && !isDue(store[n.id])
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Brain size={22} color="var(--color-accent)" />
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Spaced Repetition Review</h1>
        </div>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Review your notes using spaced repetition to reinforce long-term memory.
        </p>
      </div>

      {/* Stats row */}
      {flashcardNotes.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexShrink: 0,
          }}
        >
          {[
            { label: "Due today", value: totalDue, color: totalDue > 0 ? "var(--color-accent)" : "var(--color-text-muted)" },
            { label: "Reviewed", value: totalReviewed, color: "#10b981" },
            { label: "Total cards", value: flashcardNotes.length, color: "var(--color-text-muted)" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading || !storeLoaded ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--color-text-muted)" }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 14 }}>Loading your notes…</p>
          </div>
        ) : flashcardNotes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              maxWidth: 400,
              padding: "40px 24px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 20,
            }}
          >
            <Brain size={40} color="var(--color-border)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginBottom: 8 }}>
              No reviewable notes yet
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              Notes need AI-generated summaries or key points to appear here. Capture some notes and the AI will process them automatically.
            </p>
            <a
              href="/capture"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 16,
                padding: "9px 18px",
                borderRadius: 10,
                background: "var(--color-accent)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Capture a note
              <ChevronRight size={13} />
            </a>
          </div>
        ) : dueCards.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              maxWidth: 420,
              padding: "40px 28px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 20,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "color-mix(in srgb, #10b981 12%, transparent)",
                border: "1px solid color-mix(in srgb, #10b981 30%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Check size={28} color="#10b981" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
              All caught up!
            </p>
            {nextUpcomingReview && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  marginTop: 4,
                }}
              >
                <Clock size={13} />
                Next review in {daysUntil(nextUpcomingReview)} day
                {daysUntil(nextUpcomingReview) !== 1 ? "s" : ""}
              </div>
            )}
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.6, marginTop: 12 }}>
              You have reviewed all {totalReviewed} note{totalReviewed !== 1 ? "s" : ""}. Come back when cards are due.
            </p>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: "var(--color-surface-2)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((totalReviewed / flashcardNotes.length) * 100)}%`,
                    background: "var(--color-accent)",
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                {currentIndex + 1} / {totalDue} due
              </span>
            </div>

            <FlashCard
              note={currentCard!}
              flipped={flipped}
              onFlip={() => setFlipped(true)}
              onGotIt={handleGotIt}
              onReviewAgain={handleReviewAgain}
            />

            {/* Hint */}
            {!flipped && (
              <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
                Press Enter or click the card to reveal the full answer
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
