"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import {
  Zap, ArrowRight, CheckSquare, BookOpen, Search,
  Sparkles, TrendingUp, Clock, Plus, MessageSquare,
  BarChart2, Target, Flame,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function calcStreak(notes: { createdAt: Date | string }[]) {
  const days = new Set(notes.map(n => new Date(n.createdAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, sub, color = "var(--color-accent)", onClick }: {
  icon: React.ReactNode; value: string | number; label: string;
  sub?: string; color?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, transform 0.15s",
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 3 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, desc, onClick, accent = false }: {
  icon: React.ReactNode; label: string; desc: string; onClick: () => void; accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 14,
        border: `1px solid ${accent ? "var(--color-accent)" : "var(--color-border)"}`,
        background: accent ? "var(--color-accent)10" : "var(--color-surface)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.background = accent ? "var(--color-accent)20" : "var(--color-surface-2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = accent ? "var(--color-accent)" : "var(--color-border)"; (e.currentTarget as HTMLButtonElement).style.background = accent ? "var(--color-accent)10" : "var(--color-surface)"; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 1 }}>{desc}</p>
      </div>
    </button>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: profile } = trpc.settings.get.useQuery();
  const { data: notesData } = trpc.notes.list.useQuery({ limit: 100, offset: 0 });
  const { data: tasks } = trpc.tasks.list.useQuery({ status: "todo" });
  const { data: doneTasks } = trpc.tasks.list.useQuery({ status: "done" });
  const { data: collections } = trpc.collections.list.useQuery();

  const notes = notesData?.notes ?? [];
  const openTasks = tasks ?? [];
  const completedTasks = doneTasks ?? [];
  const streak = calcStreak(notes);

  const recentNotes = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const todayTasks = openTasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate).toDateString();
    return due === new Date().toDateString();
  });

  const overdueTasks = openTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date() && new Date(t.dueDate).toDateString() !== new Date().toDateString();
  });

  const name = profile?.displayName?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "there";

  // Weekly activity sparkline (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const count = notes.filter(n => new Date(n.createdAt).toDateString() === d.toDateString()).length;
    return count;
  });
  const maxDay = Math.max(...last14, 1);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

      {/* ── Hero greeting ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
            {getGreeting()}, {name} 👋
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-muted)", marginTop: 6 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/capture")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "var(--color-accent)", color: "white",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 14px var(--color-accent)40",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px var(--color-accent)60"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px var(--color-accent)40"; }}
        >
          <Plus size={16} /> New Capture
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
        <StatCard
          icon={<BookOpen size={20} color="var(--color-accent)" />}
          value={notes.length}
          label="Total notes"
          sub={recentNotes.length > 0 ? `+${notes.filter(n => {
            const d = new Date(n.createdAt);
            return (Date.now() - d.getTime()) < 7 * 86400000;
          }).length} this week` : undefined}
          onClick={() => router.push("/notes")}
        />
        <StatCard
          icon={<CheckSquare size={20} color="#22c55e" />}
          value={openTasks.length}
          label="Open tasks"
          sub={todayTasks.length > 0 ? `${todayTasks.length} due today` : overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "All on track"}
          color="#22c55e"
          onClick={() => router.push("/tasks")}
        />
        <StatCard
          icon={<Flame size={20} color="#f59e0b" />}
          value={streak}
          label={streak === 1 ? "Day streak" : "Day streak"}
          sub={streak > 0 ? "Keep it up!" : "Start today"}
          color="#f59e0b"
          onClick={() => router.push("/analytics")}
        />
        <StatCard
          icon={<BarChart2 size={20} color="#a78bfa" />}
          value={completedTasks.length}
          label="Tasks done"
          sub="All time"
          color="#a78bfa"
          onClick={() => router.push("/analytics")}
        />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24 }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Today's focus */}
          {(todayTasks.length > 0 || overdueTasks.length > 0) && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Target size={16} color="var(--color-accent)" />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Today's focus</span>
                </div>
                <button type="button" onClick={() => router.push("/tasks")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  All tasks <ArrowRight size={12} />
                </button>
              </div>
              <div style={{ padding: "8px 0" }}>
                {[...overdueTasks.slice(0, 2), ...todayTasks.slice(0, 3)].map(task => (
                  <div key={task.id} onClick={() => router.push("/tasks")}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: task.priority === "urgent" ? "#ef4444" : task.priority === "high" ? "#f97316" : task.priority === "medium" ? "#3b82f6" : "#6b7280" }} />
                    <p style={{ fontSize: 14, flex: 1 }}>{task.title}</p>
                    {task.dueDate && new Date(task.dueDate) < new Date() && (
                      <span style={{ fontSize: 11, color: "#ef4444", background: "#ef444415", padding: "2px 8px", borderRadius: 6 }}>Overdue</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent notes */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="var(--color-accent)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Recent captures</span>
              </div>
              <button type="button" onClick={() => router.push("/notes")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
                <BookOpen size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No notes yet — capture your first thought</p>
              </div>
            ) : (
              <div>
                {recentNotes.map((note, i) => (
                  <div key={note.id}
                    onClick={() => router.push(`/notes/${note.id}`)}
                    style={{ display: "flex", gap: 14, padding: "14px 20px", cursor: "pointer", borderBottom: i < recentNotes.length - 1 ? "1px solid var(--color-border)" : "none", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
                      {note.type === "link" ? "🔗" : note.type === "voice" ? "🎙️" : "📝"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.sourceTitle ?? note.content.slice(0, 60)}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.sourceTitle ? note.content.slice(0, 80) : note.content.slice(60, 140)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0, alignSelf: "flex-start", paddingTop: 2 }}>
                      {relativeTime(note.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity sparkline */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} color="var(--color-accent)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Capture activity</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Last 14 days</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
              {last14.map((count, i) => {
                const isToday = i === 13;
                const height = count === 0 ? 4 : Math.max(8, (count / maxDay) * 48);
                return (
                  <div key={i} title={`${count} note${count !== 1 ? "s" : ""}`}
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 4,
                      background: isToday ? "var(--color-accent)" : count === 0 ? "var(--color-border)" : "var(--color-accent)60",
                      transition: "height 0.3s",
                      cursor: "default",
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>14 days ago</span>
              <span style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 600 }}>Today</span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick actions */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <QuickAction icon={<Zap size={16} color="var(--color-accent)" />} label="Capture" desc="Add a note, link, or voice" onClick={() => router.push("/capture")} accent />
              <QuickAction icon={<Search size={16} color="var(--color-text-muted)" />} label="Search" desc="Find anything instantly" onClick={() => router.push("/search")} />
              <QuickAction icon={<MessageSquare size={16} color="var(--color-text-muted)" />} label="Chat with brain" desc="Ask your notes anything" onClick={() => router.push("/chat")} />
              <QuickAction icon={<Sparkles size={16} color="#f59e0b" />} label="Generate digest" desc="AI summary of your week" onClick={() => router.push("/digest")} />
            </div>
          </div>

          {/* Collections */}
          {(collections?.length ?? 0) > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Collections</span>
                <button type="button" onClick={() => router.push("/collections")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  All <ArrowRight size={12} />
                </button>
              </div>
              <div style={{ padding: "8px 0" }}>
                {(collections ?? []).slice(0, 5).map(col => (
                  <div key={col.id} onClick={() => router.push("/collections")}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    <span style={{ fontSize: 16 }}>{col.emoji ?? "📁"}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{col.name}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{(col as any).noteCount ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI tip */}
          <div style={{ background: "linear-gradient(135deg, var(--color-accent)18 0%, #4f46e518 100%)", border: "1px solid var(--color-accent)30", borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} color="var(--color-accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI tip</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-muted)" }}>
              Try asking your brain: <em style={{ color: "var(--color-text)" }}>"What have I been thinking about lately?"</em>
            </p>
            <button type="button" onClick={() => router.push("/chat")}
              style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
              Open chat <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
