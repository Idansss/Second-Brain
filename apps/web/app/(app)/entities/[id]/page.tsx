"use client";

import { trpc } from "@/lib/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, User, Building2, FolderOpen, Tag, MapPin, Loader2, FileText, Link2, Mic } from "lucide-react";
import { NoteCard } from "@/components/notes/NoteCard";

const TYPE_ICONS = { person: User, company: Building2, project: FolderOpen, topic: Tag, place: MapPin };
const TYPE_COLORS = { person: "#6366f1", company: "#f59e0b", project: "#22c55e", topic: "#3b82f6", place: "#ec4899" };

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = trpc.entities.byId.useQuery({ id });

  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <Loader2 size={24} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!data) return null;

  const { entity, relatedNotes } = data;
  const Icon = TYPE_ICONS[entity.type];
  const color = TYPE_COLORS[entity.type];

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Back */}
      <button onClick={() => router.push("/entities")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={14} /> Back to Knowledge Graph
      </button>

      {/* Entity header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32, padding: 24, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={26} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{entity.name}</h1>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: `${color}20`, color }}>{entity.type}</span>
          </div>
          {entity.description && (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{entity.description}</p>
          )}
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
            First seen {formatDistanceToNow(new Date(entity.createdAt), { addSuffix: true })} · {relatedNotes.length} {relatedNotes.length === 1 ? "note" : "notes"}
          </p>
        </div>
      </div>

      {/* Related notes */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "var(--color-text-muted)" }}>
          ALL NOTES MENTIONING {entity.name.toUpperCase()}
        </h2>

        {relatedNotes.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>No notes yet.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {relatedNotes.map(({ note, mentionedAs }) => (
            <div key={note.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {mentionedAs && mentionedAs !== entity.name && (
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", paddingLeft: 4 }}>
                  mentioned as "{mentionedAs}"
                </p>
              )}
              <NoteCard note={note} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
