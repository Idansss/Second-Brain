"use client";

import { formatDistanceToNow } from "date-fns";
import { Link2, FileText, Mic, CheckSquare, Users, Archive, Star } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import type { NoteRow } from "@repo/db";

const typeIcons = {
  text: FileText,
  link: Link2,
  voice: Mic,
  task: CheckSquare,
  meeting: Users,
  file: FileText,
  highlight: FileText,
};

export function NoteCard({
  note,
  pinned,
  onPin,
}: {
  note: NoteRow;
  pinned?: boolean;
  onPin?: () => void;
}) {
  const utils = trpc.useUtils();
  const archive = trpc.notes.archive.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });

  const Icon = typeIcons[note.type] ?? FileText;
  const meta = note.metadata as Record<string, unknown>;

  return (
    <Link
      href={`/notes/${note.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-accent)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-border)")
      }
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color="var(--color-text-muted)" />
          {note.sourceTitle && (
            <span style={{ fontSize: 14, fontWeight: 500 }}>{note.sourceTitle}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </span>
          {onPin !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              title={pinned ? "Unpin note" : "Pin note"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                color: pinned ? "var(--color-accent)" : "var(--color-text-muted)",
                opacity: pinned ? 1 : 0.5,
                lineHeight: 0,
              }}
            >
              <Star size={13} fill={pinned ? "currentColor" : "none"} />
            </button>
          )}
          <button
            type="button"
            title="Archive note"
            onClick={(e) => {
              e.stopPropagation();
              archive.mutate({ id: note.id });
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 2,
              opacity: 0.5,
            }}
          >
            <Archive size={13} />
          </button>
        </div>
      </div>

      {/* AI summary if available */}
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
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 12,
            color: "var(--color-accent)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {new URL(note.sourceUrl).hostname}
        </a>
      )}
    </div>
    </Link>
  );
}
