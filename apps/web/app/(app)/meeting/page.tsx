"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FileText, Loader2, Save, ChevronRight,
  CheckSquare, Lightbulb, Users, AlignLeft,
} from "lucide-react";

interface SummaryResult {
  summary: string;
  actionItems: string[];
  decisions: string[];
  attendees: string[];
}

function ResultCard({
  icon,
  title,
  accentColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 18px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{title}</span>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function ChecklistItem({
  text,
  checked,
  onToggle,
}: {
  text: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "5px 0",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `2px solid ${checked ? "var(--color-accent)" : "var(--color-border)"}`,
          background: checked ? "var(--color-accent)" : "transparent",
          flexShrink: 0,
          marginTop: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: checked ? "var(--color-text-muted)" : "var(--color-text)",
          textDecoration: checked ? "line-through" : "none",
          transition: "all 0.15s",
        }}
      >
        {text}
      </span>
    </button>
  );
}

export default function MeetingPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const summarizeMutation = trpc.intelligence.meetingSummary.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setCheckedItems(new Set());
    },
  });

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  function handleSummarize() {
    if (!transcript.trim()) return;
    summarizeMutation.mutate({ transcript });
  }

  function toggleCheck(index: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleSaveAsNote() {
    if (!result) return;
    const actionItemsList = result.actionItems
      .map((item, i) => `- [${checkedItems.has(i) ? "x" : " "}] ${item}`)
      .join("\n");
    const decisionsList = result.decisions.map((d) => `- ${d}`).join("\n");
    const attendeesList = result.attendees.join(", ");

    const content = `# Meeting Summary

## Summary
${result.summary}

## Action Items
${actionItemsList || "None captured."}

## Key Decisions
${decisionsList || "None captured."}

## Attendees
${attendeesList || "Not identified."}`;

    createNote.mutate({ content, type: "meeting" });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, height: "100%", minHeight: 0 }}>
      {/* Left — transcript input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Meeting Summary</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            Paste a meeting transcript and let AI extract the key takeaways.
          </p>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            padding: 16,
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={14} color="var(--color-text-muted)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Meeting Transcript
            </span>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={"Paste your meeting transcript here...\n\nExample:\nJohn: Let's start with the Q3 review.\nSarah: We hit 94% of our targets...\nJohn: Great. Action item for Sarah — finalize the report by Friday."}
            style={{
              flex: 1,
              minHeight: 320,
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "var(--color-text)",
              fontSize: 13,
              lineHeight: 1.7,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {transcript.length > 0 ? `${transcript.length.toLocaleString()} characters` : "No transcript yet"}
            </span>
            <button
              type="button"
              onClick={handleSummarize}
              disabled={!transcript.trim() || summarizeMutation.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 18px",
                borderRadius: 10,
                border: "none",
                cursor: !transcript.trim() || summarizeMutation.isPending ? "not-allowed" : "pointer",
                background: !transcript.trim() || summarizeMutation.isPending
                  ? "var(--color-surface-2)"
                  : "var(--color-accent)",
                color: !transcript.trim() || summarizeMutation.isPending
                  ? "var(--color-text-muted)"
                  : "white",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {summarizeMutation.isPending ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Summarizing…
                </>
              ) : (
                <>
                  <ChevronRight size={14} />
                  Summarize Meeting
                </>
              )}
            </button>
          </div>
        </div>

        {summarizeMutation.isError && (
          <div
            style={{
              padding: "10px 14px",
              background: "color-mix(in srgb, #ef4444 10%, transparent)",
              border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
              borderRadius: 10,
              fontSize: 13,
              color: "#ef4444",
            }}
          >
            Failed to summarize. Please try again.
          </div>
        )}
      </div>

      {/* Right — results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        {!result && !summarizeMutation.isPending && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--color-text-muted)",
              textAlign: "center",
              padding: "60px 24px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
            }}
          >
            <AlignLeft size={32} color="var(--color-border)" />
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>
                Results will appear here
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                Paste a transcript on the left and click Summarize Meeting to extract key information.
              </p>
            </div>
          </div>
        )}

        {summarizeMutation.isPending && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: "60px 24px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
            }}
          >
            <Loader2 size={28} color="var(--color-accent)" style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
                Analyzing transcript…
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Extracting summary, action items, decisions and attendees
              </p>
            </div>
          </div>
        )}

        {result && !summarizeMutation.isPending && (
          <>
            {/* Summary card */}
            <ResultCard
              icon={<AlignLeft size={14} color="#6366f1" />}
              title="Summary"
              accentColor="#6366f1"
            >
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--color-text)" }}>
                {result.summary || "No summary generated."}
              </p>
            </ResultCard>

            {/* Action items card */}
            <ResultCard
              icon={<CheckSquare size={14} color="#10b981" />}
              title={`Action Items (${result.actionItems.length})`}
              accentColor="#10b981"
            >
              {result.actionItems.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No action items identified.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {result.actionItems.map((item, i) => (
                    <ChecklistItem
                      key={i}
                      text={item}
                      checked={checkedItems.has(i)}
                      onToggle={() => toggleCheck(i)}
                    />
                  ))}
                </div>
              )}
            </ResultCard>

            {/* Key decisions card */}
            <ResultCard
              icon={<Lightbulb size={14} color="#f59e0b" />}
              title={`Key Decisions (${result.decisions.length})`}
              accentColor="#f59e0b"
            >
              {result.decisions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No decisions identified.</p>
              ) : (
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.decisions.map((decision, i) => (
                    <li key={i} style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-text)" }}>
                      {decision}
                    </li>
                  ))}
                </ul>
              )}
            </ResultCard>

            {/* Attendees card */}
            <ResultCard
              icon={<Users size={14} color="#3b82f6" />}
              title={`Attendees (${result.attendees.length})`}
              accentColor="#3b82f6"
            >
              {result.attendees.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No attendees identified.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.attendees.map((person, i) => (
                    <span
                      key={i}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "color-mix(in srgb, #3b82f6 12%, transparent)",
                        border: "1px solid color-mix(in srgb, #3b82f6 25%, transparent)",
                        fontSize: 12,
                        color: "var(--color-text)",
                        fontWeight: 500,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "color-mix(in srgb, #3b82f6 25%, var(--color-surface-2))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#3b82f6",
                        }}
                      >
                        {person.charAt(0).toUpperCase()}
                      </div>
                      {person}
                    </span>
                  ))}
                </div>
              )}
            </ResultCard>

            {/* Save as note */}
            <button
              type="button"
              onClick={handleSaveAsNote}
              disabled={createNote.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "11px 18px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                cursor: createNote.isPending ? "not-allowed" : "pointer",
                background: saveSuccess
                  ? "color-mix(in srgb, #10b981 15%, var(--color-surface))"
                  : "var(--color-surface)",
                borderColor: saveSuccess ? "#10b981" : "var(--color-border)",
                color: saveSuccess ? "#10b981" : "var(--color-text)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "all 0.2s",
                marginBottom: 8,
              }}
            >
              {createNote.isPending ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Saving…
                </>
              ) : saveSuccess ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Saved to Notes!
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save as Note
                </>
              )}
            </button>
          </>
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
