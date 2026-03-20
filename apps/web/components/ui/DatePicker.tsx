"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  // 0=Sun→6, convert to Mon=0
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

// value: "yyyy-mm-dd" or ""
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfMonth(viewYear, viewMonth);
  const prevTotal = daysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const cells: { day: number; current: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: prevTotal - startOffset + 1 + i, current: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const isSelected = (day: number) =>
    parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
          background: "var(--color-surface-2)",
          color: displayValue ? "var(--color-text)" : "var(--color-text-muted)",
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarDays size={14} color="var(--color-text-muted)" />
          {displayValue || placeholder}
        </span>
        {displayValue ? (
          <span onClick={clear} style={{ color: "var(--color-text-muted)", lineHeight: 0, cursor: "pointer" }}>
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={14} color="var(--color-text-muted)" />
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          zIndex: 200,
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          padding: 16,
          minWidth: 280,
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" onClick={prevMonth}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, borderRadius: 6, display: "flex" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, borderRadius: 6, display: "flex" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((cell, i) => {
              const selected = cell.current && isSelected(cell.day);
              const todayCell = cell.current && isToday(cell.day);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => cell.current && selectDay(cell.day)}
                  style={{
                    padding: "6px 0",
                    borderRadius: 8,
                    border: todayCell && !selected ? "1px solid var(--color-accent)" : "1px solid transparent",
                    background: selected ? "var(--color-accent)" : "transparent",
                    color: selected ? "#fff" : cell.current ? "var(--color-text)" : "var(--color-text-muted)",
                    fontSize: 13,
                    cursor: cell.current ? "pointer" : "default",
                    fontFamily: "inherit",
                    opacity: cell.current ? 1 : 0.3,
                    fontWeight: todayCell ? 700 : 400,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (cell.current && !selected) e.currentTarget.style.background = "var(--color-surface-2)"; }}
                  onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              style={{ fontSize: 12, color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, fontFamily: "inherit" }}>
              Clear
            </button>
            <button type="button" onClick={() => {
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              const dd = String(today.getDate()).padStart(2, "0");
              onChange(`${today.getFullYear()}-${mm}-${dd}`);
              setOpen(false);
            }}
              style={{ fontSize: 12, color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 4, fontFamily: "inherit", fontWeight: 500 }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export ChevronDown for use in DatePicker button
function ChevronDown({ size, color }: { size: number; color: string }) {
  return <ChevronRight size={size} color={color} style={{ transform: "rotate(90deg)" }} />;
}
