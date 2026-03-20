"use client";

import { trpc } from "@/lib/trpc/client";
import { useTheme } from "@/app/providers";
import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  User,
  Bell,
  Brain,
  Palette,
  Shield,
  Key,
  Webhook,
  Copy,
  Check,
  Trash2,
  Plus,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

const WEBHOOK_EVENTS = [
  { value: "note.created", label: "Note created" },
  { value: "note.updated", label: "Note updated" },
  { value: "note.deleted", label: "Note deleted" },
  { value: "task.created", label: "Task created" },
  { value: "task.completed", label: "Task completed" },
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]["value"];

// ── Shared element helpers (same as before) ───────────────────────────────────

function selectEl(
  value: string,
  onChange: (v: string) => void,
  options: { value: string; label: string }[],
  label?: string
) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={label ?? options.find((o) => o.value === value)?.label}
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "6px 10px",
        color: "var(--color-text)",
        fontSize: 13,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function toggleEl(
  value: boolean,
  onChange: (v: boolean) => void,
  label?: string
) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-label={
        label
          ? `${label}: ${value ? "enabled" : "disabled"}`
          : value
          ? "Enabled"
          : "Disabled"
      }
      aria-pressed={value ? "true" : "false"}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: value ? "var(--color-accent)" : "var(--color-border)",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function fieldEl(label: string, hint: string, input: React.ReactNode) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
        padding: "12px 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
          {hint}
        </p>
      </div>
      {input}
    </div>
  );
}

function cardEl(icon: React.ReactNode, title: string, children: React.ReactNode) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {icon}
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── API Tokens section ────────────────────────────────────────────────────────

function ApiTokensCard() {
  const utils = trpc.useUtils();
  const { data: tokens, isLoading } = trpc.apiTokens.list.useQuery();
  const create = trpc.apiTokens.create.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate(),
  });
  const revoke = trpc.apiTokens.revoke.useMutation({
    onSuccess: () => utils.apiTokens.list.invalidate(),
  });

  const [newTokenName, setNewTokenName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    const result = await create.mutateAsync({ name: newTokenName.trim() });
    setNewToken(result.rawToken);
    setNewTokenName("");
    setShowForm(false);
  }

  function handleCopy() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return cardEl(
    <Key size={15} color="var(--color-accent)" />,
    "API Tokens",
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
        Use personal API tokens to authenticate requests to the API.
      </p>

      {/* One-time token reveal */}
      {newToken && (
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-accent)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#f59e0b",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={13} />
            Store this token safely — it will not be shown again.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              style={{
                flex: 1,
                fontSize: 11,
                fontFamily: "monospace",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "6px 8px",
                wordBreak: "break-all",
                color: "var(--color-text)",
                display: "block",
              }}
            >
              {newToken}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy token"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: copied ? "#22c55e" : "var(--color-surface-2)",
                color: copied ? "white" : "var(--color-text)",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewToken(null)}
            title="Dismiss"
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              fontSize: 11,
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing tokens list */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
          <Loader2 size={16} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!isLoading && tokens && tokens.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {tokens.map((token) => (
            <div
              key={token.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              <Key size={13} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{token.name}</p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                  Created {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt &&
                    ` · Last used ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke.mutate({ id: token.id })}
                title="Revoke token"
                disabled={revoke.isPending}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  opacity: 0.7,
                  transition: "opacity 0.15s",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = "0.7")
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && tokens?.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
          No tokens yet.
        </p>
      )}

      {/* Create form */}
      {showForm ? (
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            type="text"
            placeholder="Token name"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            autoFocus
            required
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              color: "var(--color-text)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!newTokenName.trim() || create.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 12px",
              borderRadius: 7,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
              opacity: !newTokenName.trim() || create.isPending ? 0.6 : 1,
            }}
          >
            {create.isPending ? (
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Check size={12} />
            )}
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            title="Cancel"
            style={{
              padding: "6px 8px",
              borderRadius: 7,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={13} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Plus size={13} />
          New Token
        </button>
      )}
    </div>
  );
}

// ── Webhooks section ──────────────────────────────────────────────────────────

function WebhooksCard() {
  const utils = trpc.useUtils();
  const { data: webhookList, isLoading } = trpc.webhooks.list.useQuery();
  const create = trpc.webhooks.create.useMutation({
    onSuccess: () => {
      utils.webhooks.list.invalidate();
      setShowForm(false);
      setNewUrl("");
      setNewEvents([]);
    },
  });
  const deleteWebhook = trpc.webhooks.delete.useMutation({
    onSuccess: () => utils.webhooks.list.invalidate(),
  });
  const toggle = trpc.webhooks.toggle.useMutation({
    onSuccess: () => utils.webhooks.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([]);

  function toggleEvent(event: WebhookEvent) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim() || newEvents.length === 0) return;
    create.mutate({ url: newUrl.trim(), events: newEvents });
  }

  return cardEl(
    <Webhook size={15} color="var(--color-accent)" />,
    "Webhooks",
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
        Receive HTTP POST notifications when events occur in your Second Brain.
      </p>

      {/* Existing webhooks */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
          <Loader2 size={16} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!isLoading && webhookList && webhookList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {webhookList.map((wh) => (
            <div
              key={wh.id}
              style={{
                padding: "10px 12px",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--color-text)",
                    }}
                  >
                    {wh.url}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {wh.events.map((ev) => (
                      <span
                        key={ev}
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: wh.id })}
                    aria-pressed={wh.active}
                    aria-label={wh.active ? "Deactivate webhook" : "Activate webhook"}
                    title={wh.active ? "Active — click to deactivate" : "Inactive — click to activate"}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: wh.active ? "var(--color-accent)" : "var(--color-border)",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "white",
                        position: "absolute",
                        top: 3,
                        left: wh.active ? 19 : 3,
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteWebhook.mutate({ id: wh.id })}
                    title="Delete webhook"
                    disabled={deleteWebhook.isPending}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      opacity: 0.7,
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.opacity = "0.7")
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && webhookList?.length === 0 && !showForm && (
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
          No webhooks yet.
        </p>
      )}

      {/* Create form */}
      {showForm ? (
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        >
          <input
            type="url"
            placeholder="https://example.com/webhook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            required
            autoFocus
            style={{
              padding: "7px 10px",
              borderRadius: 7,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 13,
              outline: "none",
            }}
          />

          <fieldset
            style={{
              border: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <legend style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 500 }}>
              Events to subscribe to:
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    cursor: "pointer",
                    color: "var(--color-text)",
                    padding: "2px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    style={{ cursor: "pointer", accentColor: "var(--color-accent)" }}
                  />
                  <span style={{ fontFamily: "monospace", color: "var(--color-text-muted)" }}>
                    {ev.value}
                  </span>
                  <span>{ev.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={!newUrl.trim() || newEvents.length === 0 || create.isPending}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "7px 12px",
                borderRadius: 7,
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 13,
                cursor: "pointer",
                opacity:
                  !newUrl.trim() || newEvents.length === 0 || create.isPending
                    ? 0.6
                    : 1,
              }}
            >
              {create.isPending ? (
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Check size={12} />
              )}
              Add Webhook
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setNewUrl("");
                setNewEvents([]);
              }}
              title="Cancel"
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-2)",
            color: "var(--color-text)",
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Plus size={13} />
          Add Webhook
        </button>
      )}
    </div>
  );
}

// ── Main settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.settings.get.useQuery();
  const update = trpc.settings.update.useMutation();
  const updateProfile = trpc.settings.updateProfile.useMutation();
  const { setTheme: applyThemeNow } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [proactivity, setProactivity] = useState<"quiet" | "normal" | "active">("normal");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState("08:00");
  const [timezone, setTimezone] = useState("UTC");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setProactivity(profile.settings.proactivityLevel);
      setDigestEnabled(profile.settings.digestEnabled);
      setDigestTime(profile.settings.digestTime);
      setTimezone(profile.settings.timezone);
      setTheme(profile.settings.theme);
    }
  }, [profile]);

  async function handleSave() {
    await Promise.all([
      update.mutateAsync({
        proactivityLevel: proactivity,
        digestEnabled,
        digestTime,
        timezone,
        theme,
      }),
      updateProfile.mutateAsync({ displayName }),
    ]);
    utils.settings.get.invalidate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLoading)
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <Loader2
          size={24}
          color="var(--color-text-muted)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 32 }}>
      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Settings</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={update.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: saved ? "#22c55e" : "var(--color-accent)",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {update.isPending ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Save size={14} />
            )}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>

        {cardEl(
          <User size={15} color="var(--color-accent)" />,
          "Profile",
          <>
            {fieldEl(
              "Display name",
              "Used in digests and briefings",
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                title="Display name"
                placeholder="Your name"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "var(--color-text)",
                  fontSize: 13,
                  outline: "none",
                  width: 180,
                }}
              />
            )}
            {fieldEl(
              "Email",
              "Your login email",
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {profile?.email}
              </span>
            )}
          </>
        )}

        {cardEl(
          <Brain size={15} color="var(--color-accent)" />,
          "AI Proactivity",
          fieldEl(
            "Proactivity level",
            "How often the AI surfaces relevant notes",
            selectEl(
              proactivity,
              (v) => setProactivity(v as typeof proactivity),
              [
                { value: "quiet", label: "Quiet" },
                { value: "normal", label: "Normal" },
                { value: "active", label: "Active" },
              ]
            )
          )
        )}

        {cardEl(
          <Palette size={15} color="var(--color-accent)" />,
          "Appearance",
          fieldEl(
            "Theme",
            "Color theme for the app",
            selectEl(
              theme,
              (v) => {
                setTheme(v as typeof theme);
                applyThemeNow(v as typeof theme);
              },
              [
                { value: "dark", label: "Dark" },
                { value: "light", label: "Light" },
                { value: "system", label: "System" },
              ]
            )
          )
        )}
      </div>

      {/* Right column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Spacer only on desktop to align with left column header */}
        {!isMobile && <div style={{ height: 54 }} />}

        {cardEl(
          <Bell size={15} color="var(--color-accent)" />,
          "Daily Digest",
          <>
            {fieldEl(
              "Enable digest",
              "Daily AI summary of notes + tasks",
              toggleEl(digestEnabled, setDigestEnabled)
            )}
            {fieldEl(
              "Delivery time",
              "When to receive your digest",
              <input
                type="time"
                title="Delivery time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "var(--color-text)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            )}
            {fieldEl(
              "Timezone",
              "Your local timezone",
              <select
                title="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "var(--color-text)",
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                  maxWidth: 180,
                }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {cardEl(
          <Shield size={15} color="var(--color-accent)" />,
          "Account",
          <div style={{ paddingTop: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              Your data lives in your own Supabase database. You own
              everything. Export anytime as Markdown.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "#ef4444",
                fontSize: 14,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Sign out
            </button>
          </div>
        )}

        <ApiTokensCard />
        <WebhooksCard />
      </div>
    </div>
  );
}
