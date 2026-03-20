"use client";

import { trpc } from "@/lib/trpc/client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRIORITY_CHIP: Record<string, { bg: string; color: string }> = {
  urgent: { bg: "rgba(239,68,68,0.18)", color: "#ef4444" },
  high:   { bg: "rgba(249,115,22,0.18)", color: "#f97316" },
  medium: { bg: "rgba(99,102,241,0.18)", color: "#6366f1" },
  low:    { bg: "rgba(107,114,128,0.18)", color: "#6b7280" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0=Sun … 6=Sat for the first day of a month */
function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isoDate(d: Date | string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskRow = {
  id: string;
  title: string;
  priority: string;
  dueDate?: Date | string | null;
  status: string;
};

// ─── Side Panel ───────────────────────────────────────────────────────────────

function DayPanel({
  date,
  tasks,
  onClose,
}: {
  date: string; // "YYYY-MM-DD"
  tasks: TaskRow[];
  onClose: () => void;
}) {
  const display = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      width: 340,
      height: "100%",
      background: "var(--color-surface)",
      borderLeft: "1px solid var(--color-border)",
      zIndex: 500,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.25)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700 }}>{display}</p>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close day panel"
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-muted)", padding: 4, borderRadius: 6, display: "flex",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <X size={18} />
        </button>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center", marginTop: 32 }}>
            No tasks due on this day.
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                color: task.status === "done" ? "var(--color-text-muted)" : "var(--color-text)",
                textDecoration: task.status === "done" ? "line-through" : "none",
              }}>
                {task.title}
              </p>
            </div>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 4, flexShrink: 0,
              background: PRIORITY_CHIP[task.priority]?.bg ?? "transparent",
              color: PRIORITY_CHIP[task.priority]?.color ?? "var(--color-text-muted)",
            }}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function CalendarCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  tasks,
  onClick,
}: {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tasks: TaskRow[];
  onClick: () => void;
}) {
  const MAX_CHIPS = 3;
  const visible = tasks.slice(0, MAX_CHIPS);
  const overflow = tasks.length - MAX_CHIPS;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${day}${tasks.length ? `, ${tasks.length} task${tasks.length > 1 ? "s" : ""}` : ""}`}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{
        minHeight: 96,
        background: isSelected ? "var(--color-surface-2)" : "var(--color-surface)",
        border: isSelected
          ? "1.5px solid var(--color-accent)"
          : isToday
            ? "1.5px solid var(--color-accent)"
            : "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "8px 8px 6px",
        cursor: "pointer",
        opacity: isCurrentMonth ? 1 : 0.35,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        transition: "border-color 0.12s, background 0.12s",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--color-surface)";
      }}
    >
      {/* Day number */}
      <span style={{
        fontSize: 12,
        fontWeight: isToday ? 700 : 400,
        color: isToday ? "var(--color-accent)" : "var(--color-text)",
        lineHeight: 1,
        display: "block",
        textAlign: "right",
      }}>
        {day}
      </span>

      {/* Task chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visible.map((task) => (
          <div
            key={task.id}
            title={task.title}
            style={{
              fontSize: 10,
              padding: "2px 5px",
              borderRadius: 4,
              background: PRIORITY_CHIP[task.priority]?.bg ?? "transparent",
              color: PRIORITY_CHIP[task.priority]?.color ?? "var(--color-text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: 500,
            }}
          >
            {task.title}
          </div>
        ))}
        {overflow > 0 && (
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", paddingLeft: 4 }}>
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch ALL tasks (both todo and done) so we can filter by dueDate client-side
  const { data: todoTasks } = trpc.tasks.list.useQuery({ status: "todo" });
  const { data: doneTasks } = trpc.tasks.list.useQuery({ status: "done" });

  const allTasks: TaskRow[] = [
    ...(todoTasks ?? []),
    ...(doneTasks ?? []),
  ];

  // Build a map: "YYYY-MM-DD" -> TaskRow[]
  const tasksByDate = new Map<string, TaskRow[]>();
  for (const task of allTasks) {
    if (!task.dueDate) continue;
    const key = isoDate(task.dueDate);
    if (!tasksByDate.has(key)) tasksByDate.set(key, []);
    tasksByDate.get(key)!.push(task);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  // Build grid cells
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstWeekday(viewYear, viewMonth); // 0=Sun
  const prevMonthDays = daysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  type Cell = { day: number; year: number; month: number; isCurrentMonth: boolean };
  const cells: Cell[] = [];

  // Leading days from previous month
  for (let i = 0; i < startOffset; i++) {
    const d = prevMonthDays - startOffset + 1 + i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, year: y, month: m, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, year: viewYear, month: viewMonth, isCurrentMonth: true });
  }

  // Trailing days to fill out the grid (up to 6 rows × 7 = 42)
  const needed = Math.ceil(cells.length / 7) * 7;
  let trailing = 1;
  while (cells.length < needed) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: trailing++, year: y, month: m, isCurrentMonth: false });
  }

  function cellKey(c: Cell) {
    return `${c.year}-${String(c.month + 1).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
  }

  const todayKey = isoDate(today);
  const panelTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingRight: selectedDate ? 356 : 0, transition: "padding-right 0.2s" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Calendar</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Tasks due by date</p>
        </div>
        <Link
          href="/tasks"
          style={{
            fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)",
            textDecoration: "none", border: "1px solid var(--color-border)",
            borderRadius: 8, padding: "7px 14px", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-accent)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
          }}
        >
          List view
        </Link>
      </div>

      {/* Month navigation */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "12px 16px",
      }}>
        <button
          type="button"
          aria-label="Previous month"
          onClick={prevMonth}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-muted)", padding: 6, borderRadius: 8,
            display: "flex", transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronLeft size={18} />
        </button>

        <span style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "center" }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        <button
          type="button"
          onClick={goToday}
          style={{
            fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 6,
            border: "1px solid var(--color-border)", background: "none",
            color: "var(--color-text-muted)", cursor: "pointer", transition: "all 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget.style.borderColor = "var(--color-accent)");
            (e.currentTarget.style.color = "var(--color-accent)");
          }}
          onMouseLeave={(e) => {
            (e.currentTarget.style.borderColor = "var(--color-border)");
            (e.currentTarget.style.color = "var(--color-text-muted)");
          }}
        >
          Today
        </button>

        <button
          type="button"
          aria-label="Next month"
          onClick={nextMonth}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-muted)", padding: 6, borderRadius: 8,
            display: "flex", transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: "center", fontSize: 11, fontWeight: 600,
              color: "var(--color-text-muted)", textTransform: "uppercase",
              letterSpacing: "0.06em", padding: "4px 0",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((cell, i) => {
          const key = cellKey(cell);
          const tasks = tasksByDate.get(key) ?? [];
          return (
            <CalendarCell
              key={i}
              day={cell.day}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={key === todayKey}
              isSelected={key === selectedDate}
              tasks={tasks}
              onClick={() => setSelectedDate(key === selectedDate ? null : key)}
            />
          );
        })}
      </div>

      {/* Day side panel */}
      {selectedDate && (
        <DayPanel
          date={selectedDate}
          tasks={panelTasks}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
