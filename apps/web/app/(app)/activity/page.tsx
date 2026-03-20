"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  Edit,
  CheckSquare,
  CheckCircle2,
  Activity,
} from "lucide-react";

// ── Relative time helper ──────────────────────────────────────────────────────

function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateStr(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function groupLabel(dateStr: string): string {
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));
  const weekAgo = toDateStr(new Date(Date.now() - 7 * 86_400_000));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  if (dateStr >= weekAgo) return "This week";
  return "Earlier";
}

// ── Activity Item type ────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  description: string;
  time: Date;
  kind: "note-created" | "note-updated" | "task-created" | "task-completed";
}

// ── Single activity row ───────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const colors: Record<ActivityItem["kind"], string> = {
    "note-created": "var(--color-accent)",
    "note-updated": "#10b981",
    "task-created": "#f59e0b",
    "task-completed": "#22c55e",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "12px 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "var(--color-surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: colors[item.kind],
        }}
      >
        {item.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.description}
        </p>
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          flexShrink: 0,
          whiteSpace: "nowrap",
          paddingTop: 2,
        }}
      >
        {relativeTime(item.time)}
      </span>
    </div>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--color-text-muted)",
        padding: "20px 0 4px",
      }}
    >
      {label}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { data: notes = [], isLoading: notesLoading } = trpc.notes.list.useQuery({ limit: 100 });
  const { data: tasks = [], isLoading: tasksLoading } = trpc.tasks.list.useQuery({});

  const isLoading = notesLoading || tasksLoading;

  const items: ActivityItem[] = useMemo(() => {
    const result: ActivityItem[] = [];

    for (const note of notes) {
      const title =
        note.sourceTitle ??
        (note.content ? note.content.slice(0, 60).replace(/\n/g, " ") : "Untitled");
      const shortTitle = title.length > 60 ? title.slice(0, 60) + "…" : title;

      result.push({
        id: `note-created-${note.id}`,
        icon: <FileText size={15} />,
        description: `Captured: ${shortTitle}`,
        time: new Date(note.createdAt),
        kind: "note-created",
      });

      // If updatedAt is meaningfully different from createdAt (>60s), show update event
      const createdMs = new Date(note.createdAt).getTime();
      const updatedMs = new Date(note.updatedAt).getTime();
      if (updatedMs - createdMs > 60_000) {
        result.push({
          id: `note-updated-${note.id}`,
          icon: <Edit size={15} />,
          description: `Updated: ${shortTitle}`,
          time: new Date(note.updatedAt),
          kind: "note-updated",
        });
      }
    }

    for (const task of tasks) {
      const shortTitle =
        task.title.length > 60 ? task.title.slice(0, 60) + "…" : task.title;

      result.push({
        id: `task-created-${task.id}`,
        icon: <CheckSquare size={15} />,
        description: `New task: ${shortTitle}`,
        time: new Date(task.createdAt),
        kind: "task-created",
      });

      if (task.status === "done" && task.updatedAt) {
        result.push({
          id: `task-completed-${task.id}`,
          icon: <CheckCircle2 size={15} />,
          description: `Completed: ${shortTitle}`,
          time: new Date(task.updatedAt),
          kind: "task-completed",
        });
      }
    }

    // Sort newest first
    result.sort((a, b) => b.time.getTime() - a.time.getTime());
    return result.slice(0, 200);
  }, [notes, tasks]);

  // Group by date label
  const groups = useMemo(() => {
    const ORDER = ["Today", "Yesterday", "This week", "Earlier"];
    const map = new Map<string, ActivityItem[]>();
    for (const item of items) {
      const dateStr = toDateStr(item.time);
      const label = groupLabel(dateStr);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(item);
    }
    // Ensure consistent ordering
    const ordered: { label: string; items: ActivityItem[] }[] = [];
    for (const label of ORDER) {
      if (map.has(label)) {
        ordered.push({ label, items: map.get(label)! });
      }
    }
    return ordered;
  }, [items]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
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
          <Activity size={22} color="var(--color-accent)" />
          Activity
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          A chronological feed of everything happening in your Second Brain.
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: "var(--color-text-muted)", textAlign: "center", paddingTop: 48 }}>
          Loading activity…
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "var(--color-text-muted)",
          }}
        >
          <Activity size={40} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p style={{ fontSize: 15 }}>No activity yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Start capturing notes and creating tasks to see your feed.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "0 24px",
          }}
        >
          {groups.map(({ label, items: groupItems }) => (
            <div key={label}>
              <GroupHeader label={label} />
              {groupItems.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ))}
          {/* Remove border on last item */}
          <style>{`
            div[data-activity-last] {
              border-bottom: none;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
