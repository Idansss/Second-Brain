"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Loader2, ExternalLink, Lightbulb, Calendar, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function IntelligencePage() {
  const [briefTopic, setBriefTopic] = useState("");
  const [submittedTopic, setSubmittedTopic] = useState("");
  const [digestData, setDigestData] = useState<{
    weekOf: string;
    themes: string[];
    accomplishments: string[];
    patterns: string[];
    nextWeekFocus: string[];
    rawSummary: string;
  } | null>(null);

  // Stale topics
  const { data: staleTopics, isLoading: staleLoading } =
    trpc.intelligence.staleTopics.useQuery();

  // Pre-meeting brief (only fires when topic is submitted)
  const { data: brief, isLoading: briefLoading } =
    trpc.intelligence.preMeetingBrief.useQuery(
      { topic: submittedTopic },
      { enabled: submittedTopic.length > 0 }
    );

  // Weekly digest mutation
  const weeklyDigest = trpc.intelligence.weeklyDigest.useMutation({
    onSuccess: (data) => setDigestData(data),
  });

  function handleBriefSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (briefTopic.trim()) setSubmittedTopic(briefTopic.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Intelligence</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          AI-powered insights from your second brain
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "flex-start" }}>
        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Stale Topics */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Calendar size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Stale Topics</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Entities from your notes that you haven&apos;t revisited in 14+ days.
            </p>

            {staleLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Loader2
                  size={20}
                  color="var(--color-text-muted)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            )}

            {!staleLoading && staleTopics && staleTopics.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                No stale topics — you&apos;re on top of everything!
              </p>
            )}

            {!staleLoading && staleTopics && staleTopics.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {staleTopics.map((item) => {
                  const daysAgo = Math.floor(
                    (Date.now() - new Date(item.lastSeen).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={item.entity.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "var(--color-surface-2)",
                        borderRadius: "var(--radius-md)",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--color-text)",
                            marginBottom: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.entity.name}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          Last seen {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago &middot;{" "}
                          {item.noteCount} note{item.noteCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Link
                        href={`/entities/${item.entity.id}`}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--color-accent)",
                          color: "var(--color-accent)",
                          textDecoration: "none",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        Revisit
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pre-Meeting Brief */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <FileText size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Pre-Meeting Brief</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Enter a topic, person, or project to surface related notes.
            </p>

            <form onSubmit={handleBriefSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={briefTopic}
                onChange={(e) => setBriefTopic(e.target.value)}
                placeholder="e.g. Q4 planning, Alice, Product Roadmap..."
                style={{
                  flex: 1,
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "var(--color-text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!briefTopic.trim() || briefLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: !briefTopic.trim() || briefLoading ? "not-allowed" : "pointer",
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 500,
                  opacity: !briefTopic.trim() || briefLoading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {briefLoading ? (
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                ) : null}
                Search
              </button>
            </form>

            {briefLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
                <Loader2
                  size={20}
                  color="var(--color-text-muted)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              </div>
            )}

            {!briefLoading && brief && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    marginBottom: 4,
                  }}
                >
                  {brief.context}
                </p>
                {brief.notes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      border: "1px solid var(--color-border)",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text)",
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {note.source_title ?? note.content.slice(0, 60)}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      {note.type} &middot;{" "}
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </Link>
                ))}
                {brief.notes.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                    No related notes found. Try capturing some!
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div>
          {/* Weekly Synthesis */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Lightbulb size={16} color="var(--color-accent)" />
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Weekly Synthesis</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              AI-generated synthesis of your notes from the past 7 days.
            </p>

            <button
              onClick={() => weeklyDigest.mutate()}
              disabled={weeklyDigest.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                cursor: weeklyDigest.isPending ? "not-allowed" : "pointer",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                opacity: weeklyDigest.isPending ? 0.7 : 1,
                marginBottom: 20,
                transition: "opacity 0.15s",
              }}
            >
              {weeklyDigest.isPending ? (
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Lightbulb size={13} />
              )}
              {weeklyDigest.isPending ? "Generating…" : "Generate Digest"}
            </button>

            {digestData && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Week of {digestData.weekOf}
                </p>

                <p
                  style={{
                    fontSize: 14,
                    color: "var(--color-text)",
                    lineHeight: 1.6,
                    padding: "12px 14px",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-md)",
                    borderLeft: "3px solid var(--color-accent)",
                  }}
                >
                  {digestData.rawSummary}
                </p>

                {digestData.themes.length > 0 && (
                  <DigestSection title="Key Themes" items={digestData.themes} color="#6366f1" />
                )}
                {digestData.accomplishments.length > 0 && (
                  <DigestSection
                    title="Accomplishments"
                    items={digestData.accomplishments}
                    color="#22c55e"
                  />
                )}
                {digestData.patterns.length > 0 && (
                  <DigestSection title="Patterns" items={digestData.patterns} color="#f59e0b" />
                )}
                {digestData.nextWeekFocus.length > 0 && (
                  <DigestSection
                    title="Focus Next Week"
                    items={digestData.nextWeekFocus}
                    color="#ec4899"
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DigestSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 13,
              color: "var(--color-text)",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: color,
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
