import { notes, userProfiles } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { FileText, Link2, Mic, CheckSquare, Users } from "lucide-react";

import { db } from "@/server/db";

async function getSharedNote(token: string) {
  const profiles = await db.select().from(userProfiles);

  for (const profile of profiles) {
    const settings = (profile.settings ?? {}) as unknown as Record<string, unknown>;
    const shareLinks = (settings.shareLinks ?? {}) as Record<string, string>;

    if (shareLinks[token]) {
      const noteId = shareLinks[token];
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.status, "active")));

      if (note) return note;
    }
  }

  return null;
}

const typeIcons: Record<string, React.ElementType> = {
  text: FileText,
  link: Link2,
  voice: Mic,
  task: CheckSquare,
  meeting: Users,
  file: FileText,
  highlight: FileText,
};

const typeBadgeColors: Record<string, string> = {
  text: "#6366f1",
  link: "#3b82f6",
  voice: "#22c55e",
  task: "#f59e0b",
  meeting: "#ec4899",
  file: "#8b5cf6",
  highlight: "#f97316",
};

export default async function SharedNotePage({
  params,
}: {
  params: { token: string };
}) {
  const note = await getSharedNote(params.token);

  if (!note) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg, #0f0f13)",
          color: "var(--color-text, #f0f0f4)",
          gap: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Note not found</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted, #8888a0)" }}>
          This link may have expired or been removed.
        </p>
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: "#6366f1",
            textDecoration: "none",
          }}
        >
          Go to Second Brain
        </Link>
      </div>
    );
  }

  const meta = (note.metadata ?? {}) as Record<string, unknown>;
  const summary = meta.summary as string | undefined;
  const keyPoints = meta.keyPoints as string[] | undefined;
  const Icon = typeIcons[note.type] ?? FileText;
  const badgeColor = typeBadgeColors[note.type] ?? "#6366f1";

  const displayTitle = note.sourceTitle
    ? note.sourceTitle
    : note.content.slice(0, 80) + (note.content.length > 80 ? "…" : "");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg, #0f0f13)",
        color: "var(--color-text, #f0f0f4)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--color-border, #2a2a3a)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <img
          src="/logo-dark.png?v=1"
          alt="Second Brain logo"
          style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }}
        />
        <span style={{ fontWeight: 700, fontSize: 15 }}>Second Brain</span>
        <span
          style={{
            marginLeft: 8,
            fontSize: 12,
            color: "var(--color-text-muted, #8888a0)",
            padding: "2px 8px",
            background: "var(--color-surface-2, #1a1a2e)",
            borderRadius: 4,
          }}
        >
          Shared Note
        </span>
      </header>

      {/* Content */}
      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
          padding: "40px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Title */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <Icon size={18} color={badgeColor} />
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: `${badgeColor}20`,
                color: badgeColor,
                textTransform: "capitalize",
              }}
            >
              {note.type}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>
            {displayTitle}
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-muted, #8888a0)" }}>
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* AI Summary */}
        {summary && (
          <div
            style={{
              background: "var(--color-surface, #17171f)",
              border: "1px solid var(--color-border, #2a2a3a)",
              borderRadius: 12,
              padding: 20,
              borderLeft: "3px solid #6366f1",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted, #8888a0)",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              AI SUMMARY
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{summary}</p>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            background: "var(--color-surface, #17171f)",
            border: "1px solid var(--color-border, #2a2a3a)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted, #8888a0)",
              letterSpacing: "0.05em",
              marginBottom: 14,
            }}
          >
            CONTENT
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {note.content}
          </p>
        </div>

        {/* Source URL */}
        {note.sourceUrl && (
          <a
            href={note.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: "#6366f1",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            View original source
          </a>
        )}

        {/* Key Points */}
        {keyPoints && keyPoints.length > 0 && (
          <div
            style={{
              background: "var(--color-surface, #17171f)",
              border: "1px solid var(--color-border, #2a2a3a)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted, #8888a0)",
                letterSpacing: "0.05em",
                marginBottom: 12,
              }}
            >
              KEY POINTS
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {keyPoints.map((point, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#6366f1",
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--color-border, #2a2a3a)",
          padding: "16px 24px",
          textAlign: "center",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 13,
            color: "var(--color-text-muted, #8888a0)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <img
            src="/logo-dark.png?v=1"
            alt="Second Brain logo"
            style={{ width: 13, height: 13, borderRadius: 3, objectFit: "cover" }}
          />
          Captured with Second Brain
        </Link>
      </footer>
    </div>
  );
}
