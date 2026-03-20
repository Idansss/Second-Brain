"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, TrendingUp, TrendingDown, Star, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DigestPage() {
  const router = useRouter();
  const generate = trpc.digest.generate.useMutation();
  const [digest, setDigest] = useState<Awaited<ReturnType<typeof generate.mutateAsync>> | null>(null);

  async function handleGenerate() {
    const result = await generate.mutateAsync();
    setDigest(result);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Daily Digest</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            AI-synthesized overview of your notes, open loops, and what matters today.
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generate.isPending}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none", cursor: generate.isPending ? "not-allowed" : "pointer", background: "var(--color-accent)", color: "white", fontSize: 14, fontWeight: 500, opacity: generate.isPending ? 0.7 : 1, flexShrink: 0, whiteSpace: "nowrap" }}>
          {generate.isPending
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
            : digest
            ? <><RefreshCw size={14} /> Regenerate</>
            : <><Sparkles size={14} /> Generate digest</>}
        </button>
      </div>

      {!digest && !generate.isPending && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 16, color: "var(--color-text-muted)" }}>
          <Sparkles size={40} color="var(--color-accent)" />
          <p style={{ fontSize: 15, fontWeight: 500 }}>Your AI briefing is ready to generate</p>
          <p style={{ fontSize: 13, textAlign: "center", maxWidth: 340 }}>
            Synthesizes your last 7 days of notes, open tasks, and surfaces what you should focus on today.
          </p>
        </div>
      )}

      {generate.isPending && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 60, color: "var(--color-text-muted)" }}>
          <Loader2 size={32} color="var(--color-accent)" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 14 }}>Analyzing your notes and tasks...</p>
        </div>
      )}

      {digest && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Greeting */}
          <div style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, #4f46e5 100%)", borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "white", marginBottom: 8 }}>{digest.greeting}</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{digest.summary}</p>
          </div>

          {/* Week stats */}
          {digest.weekStats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: "var(--color-accent)" }}>{digest.weekStats.notesThisWeek}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Notes this week</p>
                {digest.weekStats.notesDelta !== 0 && (
                  <p style={{ fontSize: 11, marginTop: 4, color: digest.weekStats.notesDelta > 0 ? "#22c55e" : "#ef4444" }}>
                    {digest.weekStats.notesDelta > 0 ? "+" : ""}{digest.weekStats.notesDelta} vs last week
                  </p>
                )}
              </div>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <BarChart2 size={28} color="var(--color-accent)" style={{ margin: "0 auto 4px" }} />
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Top topics</p>
                <p style={{ fontSize: 11, color: "var(--color-text)", marginTop: 4, lineHeight: 1.4 }}>{digest.weekStats.topTopics.slice(0,2).join(" · ")}</p>
              </div>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{digest.openLoops.length}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Open loops</p>
              </div>
            </div>
          )}

          {/* Highlights */}
          {digest.highlights?.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Star size={16} color="#f59e0b" />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>This week's highlights</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {digest.highlights.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 6, flexShrink: 0 }} />
                    <p style={{ fontSize: 14, lineHeight: 1.5 }}>{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested focus */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-accent)", borderRadius: 12, padding: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <CheckCircle2 size={20} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Focus for today</p>
              <p style={{ fontSize: 15, fontWeight: 500 }}>{digest.suggestedFocus}</p>
            </div>
          </div>

          {/* Trends */}
          {digest.trends?.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Trends</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {digest.trends.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: 8 }}>
                    {t.direction === "rising" || t.direction === "new"
                      ? <TrendingUp size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                      : <TrendingDown size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                        {t.topic}
                        {t.direction === "new" && <span style={{ marginLeft: 8, fontSize: 10, background: "var(--color-accent)", color: "white", padding: "1px 6px", borderRadius: 4 }}>NEW</span>}
                      </p>
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{t.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open loops */}
          {digest.openLoops.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AlertCircle size={16} color="#f59e0b" />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Open loops</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {digest.openLoops.map((loop, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 6, flexShrink: 0 }} />
                    <p style={{ fontSize: 14, lineHeight: 1.5 }}>{loop}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resurfaced notes */}
          {digest.resurfacedNotes.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Resurfaced — worth revisiting</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {digest.resurfacedNotes.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px", background: "var(--color-surface-2)", borderRadius: 8, gap: 12 }}>
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{item.reason}</p>
                    <button type="button" title="View notes" onClick={() => router.push(`/notes`)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", flexShrink: 0 }}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
