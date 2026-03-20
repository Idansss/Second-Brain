"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Flame, FileText, CheckCircle, FolderOpen, BarChart2 } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function calcStreak(notes: { createdAt: Date | string }[]): number {
  if (notes.length === 0) return 0;
  const days = new Set(notes.map((n) => toDateStr(n.createdAt)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(toDateStr(d))) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function getLast30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        minWidth: 140,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: accent ? "rgba(99,102,241,0.15)" : "var(--color-surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent ? "var(--color-accent)" : "var(--color-text-muted)",
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{label}</div>
    </div>
  );
}

// ── SVG Bar Chart (notes per day) ─────────────────────────────────────────────

function NotesBarChart({ data }: { data: Record<string, number> }) {
  const days = getLast30Days();
  const counts = days.map((d) => data[d] ?? 0);
  const max = Math.max(...counts, 1);

  const W = 600;
  const H = 120;
  const barW = Math.floor((W - 40) / days.length) - 2;
  const gap = Math.floor((W - 40) / days.length);

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        style={{ width: "100%", display: "block" }}
        aria-label="Notes created per day over the last 30 days"
      >
        {counts.map((count, i) => {
          const barH = count === 0 ? 2 : Math.max(4, (count / max) * H);
          const x = 20 + i * gap;
          const y = H - barH;

          return (
            <g key={days[i]}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill="var(--color-accent)"
                opacity={count === 0 ? 0.15 : 0.85}
                style={{ transition: "opacity 0.2s" }}
              >
                <title>{`${days[i]}: ${count} note${count !== 1 ? "s" : ""}`}</title>
              </rect>
            </g>
          );
        })}
        {/* X-axis labels: show every 5th day */}
        {days.map((d, i) => {
          if (i % 5 !== 0 && i !== days.length - 1) return null;
          const x = 20 + i * gap + barW / 2;
          const label = d.slice(5); // MM-DD
          return (
            <text
              key={d}
              x={x}
              y={H + 18}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-muted)"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Tag Bar Chart ─────────────────────────────────────────────────────────────

function TagBars({ tags }: { tags: { name: string; count: number }[] }) {
  const top = tags.slice(0, 10);
  const max = top[0]?.count ?? 1;

  if (top.length === 0) {
    return (
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, padding: "12px 0" }}>
        No tags yet. Tags are auto-extracted when you capture notes.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {top.map(({ name, count }) => {
        const pct = Math.round((count / max) * 100);
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 100,
                fontSize: 13,
                color: "var(--color-text)",
                textAlign: "right",
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            <div
              style={{
                flex: 1,
                height: 20,
                background: "var(--color-surface-2)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "var(--color-accent)",
                  opacity: 0.8,
                  borderRadius: 4,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <span
              style={{
                width: 28,
                fontSize: 12,
                color: "var(--color-text-muted)",
                flexShrink: 0,
                textAlign: "right",
              }}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "24px",
      }}
    >
      <h2
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--color-text)",
          marginBottom: 20,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: notes = [], isLoading: notesLoading } = trpc.notes.list.useQuery({ limit: 100 });
  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery({});
  const { data: collections = [] } = trpc.collections.list.useQuery();
  const { data: tagData = [] } = trpc.notes.listTags.useQuery();

  const isLoading = notesLoading || tasksLoading;

  // Notes per day map
  const notesPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notes) {
      const d = toDateStr(n.createdAt);
      map[d] = (map[d] ?? 0) + 1;
    }
    return map;
  }, [notes]);

  const streak = useMemo(() => calcStreak(notes), [notes]);
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  if (isLoading) {
    return (
      <div style={{ color: "var(--color-text-muted)", paddingTop: 48, textAlign: "center" }}>
        Loading analytics…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <BarChart2 size={22} color="var(--color-accent)" />
          Analytics
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Your knowledge capture stats at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <StatCard label="Total Notes" value={notes.length} icon={FileText} accent />
        <StatCard label="Tasks Completed" value={completedTasks} icon={CheckCircle} />
        <StatCard label="Collections" value={collections.length} icon={FolderOpen} />
        <StatCard
          label="Current Streak"
          value={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Flame size={22} color={streak > 0 ? "#f97316" : "var(--color-text-muted)"} />
              {streak}d
            </span>
          }
          icon={Flame}
          accent={streak > 2}
        />
      </div>

      {/* Notes over time */}
      <Section title="Notes over the last 30 days">
        {notes.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No notes yet. Start capturing to see your activity.
          </p>
        ) : (
          <NotesBarChart data={notesPerDay} />
        )}
      </Section>

      {/* Top tags */}
      <Section title="Top tags by note count">
        <TagBars tags={tagData.map((t) => ({ name: t.name, count: t.count }))} />
      </Section>

      {/* Streak detail */}
      <Section title="Capture streak">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Flame
            size={48}
            color={streak > 0 ? "#f97316" : "var(--color-border)"}
            strokeWidth={1.5}
          />
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--color-text)", lineHeight: 1 }}>
              {streak} {streak === 1 ? "day" : "days"}
            </div>
            <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 4 }}>
              {streak === 0
                ? "Capture a note today to start your streak!"
                : streak === 1
                ? "Great start — keep it going tomorrow!"
                : `You've captured notes ${streak} days in a row. Keep it up!`}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
