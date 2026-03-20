"use client";

import { CaptureBox } from "@/components/capture/CaptureBox";
import { trpc } from "@/lib/trpc/client";
import { NoteCard } from "@/components/notes/NoteCard";
import { Onboarding } from "@/components/Onboarding";
import { formatDistanceToNow } from "date-fns";

export default function CapturePage() {
  const { data: recentNotes } = trpc.notes.list.useQuery({ limit: 10 });
  const hasNotes = (recentNotes?.length ?? 0) > 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, height: "100%" }}>
      {/* Left — capture */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Capture</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Save anything — notes, links, voice, tasks. AI organizes it automatically.</p>
        </div>
        <Onboarding hasNotes={hasNotes} />
        <CaptureBox />

        {/* Quick tips */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Quick tips</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              ["📎", "Paste any URL to auto-extract title, summary & key points"],
              ["🎤", "Record voice notes — they're automatically transcribed"],
              ["⌘↵", "Press Cmd+Enter (or Ctrl+Enter) to save instantly"],
            ].map(([icon, tip]) => (
              <div key={tip} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — recent notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-muted)" }}>RECENT CAPTURES</h2>
          <a href="/notes" style={{ fontSize: 13, color: "var(--color-accent)", textDecoration: "none" }}>View all →</a>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {!recentNotes?.length && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
              Nothing captured yet. Start adding notes.
            </div>
          )}
          {recentNotes?.map((note) => <NoteCard key={note.id} note={note} />)}
        </div>
      </div>
    </div>
  );
}
