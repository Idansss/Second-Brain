"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Users, Loader2, Copy, Check, FileText, Link2, Mic, CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NoteRow } from "@repo/db";

// ── Read-only note card for shared brains ─────────────────────────────────────
// NoteCard from @/components/notes/NoteCard is interactive (archive, link to /notes/:id)
// so we render a lightweight read-only version here instead.

const typeIcons: Record<string, React.ElementType> = {
  text: FileText,
  link: Link2,
  voice: Mic,
  task: CheckSquare,
  meeting: Users,
  file: FileText,
  highlight: FileText,
};

function ReadOnlyNoteCard({ note }: { note: NoteRow }) {
  const Icon = typeIcons[note.type] ?? FileText;
  const meta = note.metadata as Record<string, unknown>;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color="var(--color-text-muted)" />
          {note.sourceTitle && (
            <span style={{ fontSize: 14, fontWeight: 500 }}>{note.sourceTitle}</span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>
          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Content */}
      {meta.summary ? (
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          {meta.summary as string}
        </p>
      ) : (
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.content}
        </p>
      )}

      {/* Source URL */}
      {note.sourceUrl && (
        <a
          href={note.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: "var(--color-accent)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {(() => {
            try {
              return new URL(note.sourceUrl).hostname;
            } catch {
              return note.sourceUrl;
            }
          })()}
        </a>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SharedBrainPage() {
  // Left column state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [invitedTo, setInvitedTo] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Right column state
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // tRPC
  const { data: collaborators, isLoading: loadingCollaborators, refetch: refetchCollaborators } =
    trpc.sharing.getCollaborators.useQuery();

  const inviteMutation = trpc.sharing.inviteCollaborator.useMutation({
    onSuccess: (data) => {
      setInviteToken(data.token);
      setInviteEmailSent(data.emailSent ?? false);
      setInvitedTo(inviteEmail);
      setInviteEmail("");
    },
  });

  const acceptMutation = trpc.sharing.acceptInvite.useMutation({
    onSuccess: (data) => {
      setAcceptSuccess(`Connected! You can now view ${data.inviterUserId}'s brain.`);
      setAcceptToken("");
      setAcceptError(null);
      void refetchCollaborators();
    },
    onError: (err) => {
      setAcceptError(err.message);
    },
  });

  const { data: sharedBrainData, isLoading: loadingBrain, error: brainError } =
    trpc.sharing.getSharedBrain.useQuery(
      { userId: viewingUserId! },
      { enabled: !!viewingUserId }
    );

  const sharedNotes = sharedBrainData?.notes ?? [];
  const filteredNotes = searchQuery
    ? sharedNotes.filter(
        (n) =>
          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (n.sourceTitle ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sharedNotes;

  const inviteLink =
    inviteToken
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared-brain?accept=${inviteToken}`
      : null;

  function handleCopy() {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Shared Brains</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Collaborate by browsing each other's notes
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, flex: 1, minHeight: 0 }}>

        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* My Collaborators */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color="var(--color-accent)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>My Collaborators</span>
            </div>

            {loadingCollaborators && (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                <Loader2 size={18} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}

            {!loadingCollaborators && (!collaborators || collaborators.length === 0) && (
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                No collaborators yet. Invite someone below.
              </p>
            )}

            {collaborators && collaborators.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {collaborators.map((userId) => (
                  <div
                    key={userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      background: "var(--color-surface-2)",
                      borderRadius: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 140,
                      }}
                      title={userId}
                    >
                      {userId.slice(0, 8)}…
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingUserId(userId);
                        setSearchQuery("");
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--color-accent)",
                        background:
                          viewingUserId === userId ? "var(--color-accent)" : "transparent",
                        color: viewingUserId === userId ? "white" : "var(--color-accent)",
                        fontSize: 11,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      View their brain
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Invite Someone */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Invite Someone</span>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Enter their email — they&apos;ll receive an invite directly in their inbox.
            </p>

            {/* Success state */}
            {inviteToken && inviteEmailSent ? (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", marginBottom: 4 }}>
                  ✓ Invite sent to {invitedTo}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                  They&apos;ll receive an email with a link to connect.
                </p>
                <button
                  type="button"
                  onClick={() => { setInviteToken(null); setInviteEmailSent(false); }}
                  style={{ marginTop: 8, fontSize: 12, background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}
                >
                  Invite another person
                </button>
              </div>
            ) : inviteToken && !inviteEmailSent ? (
              /* Fallback: email couldn't be sent, show manual link */
              <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "#f59e0b" }}>⚠ Email could not be sent automatically. Share this link manually:</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <code style={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 8px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
                    {inviteLink}
                  </code>
                  <button type="button" onClick={handleCopy} title="Copy link" style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: copied ? "var(--color-accent)" : "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Token: <code>{inviteToken}</code></p>
                <button type="button" onClick={() => setInviteToken(null)} style={{ fontSize: 12, background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0, textAlign: "left" }}>Invite another</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inviteEmail && inviteMutation.mutate({ email: inviteEmail })}
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", color: "var(--color-text)", fontSize: 13, outline: "none" }}
                />
                <button
                  type="button"
                  disabled={!inviteEmail || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate({ email: inviteEmail })}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--color-accent)", color: "white", fontSize: 13, cursor: inviteEmail && !inviteMutation.isPending ? "pointer" : "not-allowed", opacity: inviteEmail && !inviteMutation.isPending ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                >
                  {inviteMutation.isPending
                    ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending...</>
                    : "Send invite"}
                </button>
              </div>
            )}

            {inviteMutation.error && (
              <p style={{ fontSize: 12, color: "#ef4444" }}>{inviteMutation.error.message}</p>
            )}
          </section>

          {/* Accept Invite */}
          <section
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Accept an Invite</span>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Got an invite token from a collaborator? Paste it here to connect.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Paste invite token…"
                value={acceptToken}
                onChange={(e) => {
                  setAcceptToken(e.target.value);
                  setAcceptError(null);
                  setAcceptSuccess(null);
                }}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface-2)",
                  color: "var(--color-text)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="button"
                disabled={!acceptToken || acceptMutation.isPending}
                onClick={() => acceptMutation.mutate({ token: acceptToken })}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: 13,
                  cursor: acceptToken && !acceptMutation.isPending ? "pointer" : "not-allowed",
                  opacity: acceptToken && !acceptMutation.isPending ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {acceptMutation.isPending && (
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                )}
                Accept
              </button>
            </div>

            {acceptError && (
              <p style={{ fontSize: 12, color: "#ef4444" }}>{acceptError}</p>
            )}
            {acceptSuccess && (
              <p style={{ fontSize: 12, color: "#22c55e" }}>{acceptSuccess}</p>
            )}
          </section>
        </div>

        {/* ── Right column ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
          }}
        >
          {!viewingUserId && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "var(--color-text-muted)",
                paddingTop: 60,
              }}
            >
              <Users size={40} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: 15 }}>Select a collaborator on the left to browse their brain.</p>
            </div>
          )}

          {viewingUserId && (
            <>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>
                    You&apos;re viewing{" "}
                    <code
                      style={{
                        fontFamily: "monospace",
                        background: "var(--color-surface-2)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                    >
                      {viewingUserId.slice(0, 8)}…
                    </code>
                    &apos;s brain
                  </h2>
                  {!loadingBrain && !brainError && (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
                      {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
                      {searchQuery ? " matching" : ""}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setViewingUserId(null)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search notes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: 13,
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />

              {/* Loading */}
              {loadingBrain && (
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
                  <Loader2
                    size={24}
                    color="var(--color-text-muted)"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                </div>
              )}

              {/* Error */}
              {brainError && (
                <div
                  style={{
                    padding: 16,
                    background: "var(--color-surface)",
                    border: "1px solid #ef4444",
                    borderRadius: "var(--radius-md)",
                    color: "#ef4444",
                    fontSize: 13,
                  }}
                >
                  {brainError.message}
                </div>
              )}

              {/* Empty state */}
              {!loadingBrain && !brainError && filteredNotes.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 60,
                    gap: 8,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {searchQuery ? (
                    <p style={{ fontSize: 14 }}>No notes match &ldquo;{searchQuery}&rdquo;</p>
                  ) : (
                    <p style={{ fontSize: 14 }}>This user has no active notes yet.</p>
                  )}
                </div>
              )}

              {/* Notes grid */}
              {!loadingBrain && !brainError && filteredNotes.length > 0 && (
                <div style={{ columns: "2 300px", gap: 12 }}>
                  {filteredNotes.map((note) => (
                    <div key={note.id} style={{ breakInside: "avoid", marginBottom: 12 }}>
                      <ReadOnlyNoteCard note={note} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
