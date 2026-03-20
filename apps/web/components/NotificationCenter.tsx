"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { Bell, X, Check, Trash2 } from "lucide-react";

export type NotificationType = "ai" | "digest" | "overdue" | "stale" | "info";

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  href?: string;
  read: boolean;
  createdAt: number;
}

const STORAGE_KEY = "notifications";

function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function addNotification(
  message: string,
  type: NotificationType = "info",
  href?: string
) {
  const existing = loadNotifications();
  const next: AppNotification[] = [
    {
      id: crypto.randomUUID(),
      message,
      type,
      href,
      read: false,
      createdAt: Date.now(),
    },
    ...existing,
  ].slice(0, 50);
  saveNotifications(next);
  window.dispatchEvent(new Event("notifications-updated"));
}

const TYPE_COLOR: Record<NotificationType, string> = {
  ai: "#6366f1",
  digest: "#8b5cf6",
  overdue: "#ef4444",
  stale: "#f59e0b",
  info: "#6b7280",
};

const TYPE_DOT: Record<NotificationType, string> = {
  ai: "#6366f1",
  digest: "#8b5cf6",
  overdue: "#ef4444",
  stale: "#f59e0b",
  info: "#6b7280",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(() => {
    setNotifications(loadNotifications());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("notifications-updated", refresh);
    return () => window.removeEventListener("notifications-updated", refresh);
  }, [refresh]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function markRead(id: string) {
    const next = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(next);
    saveNotifications(next);
  }

  function clearAll() {
    setNotifications([]);
    saveNotifications([]);
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        type="button"
        ref={btnRef}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        onClick={() => {
          if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropdownStyle({
              position: "fixed",
              top: rect.bottom + 8,
              left: rect.right + 8,
              width: 320,
            });
          }
          setOpen((v) => !v);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: 8,
          border: "1px solid var(--color-border)",
          background: open ? "var(--color-surface-2)" : "transparent",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          transition: "all 0.15s",
          marginLeft: 4,
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ef4444",
              border: "1.5px solid var(--color-surface)",
            }}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            ...dropdownStyle,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Notifications
              {unread > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                  }}
                >
                  {unread} new
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {notifications.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear all notifications"
                  onClick={clearAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "var(--color-text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "3px 6px",
                    borderRadius: 4,
                  }}
                >
                  <Trash2 size={11} />
                  Clear all
                </button>
              )}
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  padding: 3,
                  borderRadius: 4,
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "28px 16px",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: 13,
                }}
              >
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom: "1px solid var(--color-border)",
                    background: n.read ? "transparent" : "rgba(99,102,241,0.04)",
                    cursor: n.href ? "pointer" : "default",
                    transition: "background 0.1s",
                  }}
                  onClick={() => {
                    markRead(n.id);
                    if (n.href) window.location.href = n.href;
                  }}
                >
                  {/* Type dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      marginTop: 5,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: TYPE_DOT[n.type],
                      opacity: n.read ? 0.4 : 1,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: n.read
                          ? "var(--color-text-muted)"
                          : "var(--color-text)",
                        fontWeight: n.read ? 400 : 500,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      aria-label="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                      style={{
                        flexShrink: 0,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-muted)",
                        padding: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
