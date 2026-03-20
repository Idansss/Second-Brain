"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, FolderOpen, Tag, MapPin, Loader2 } from "lucide-react";

const TYPE_ICONS = {
  person: User,
  company: Building2,
  project: FolderOpen,
  topic: Tag,
  place: MapPin,
};

const TYPE_COLORS = {
  person: "#6366f1",
  company: "#f59e0b",
  project: "#22c55e",
  topic: "#3b82f6",
  place: "#ec4899",
};

const TYPES = ["person", "company", "project", "topic", "place"] as const;

export default function EntitiesPage() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<typeof TYPES[number] | "all">("all");
  const { data, isLoading } = trpc.entities.list.useQuery({
    type: activeType === "all" ? undefined : activeType,
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Knowledge Graph</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          People, companies, projects, and topics extracted from your notes.
        </p>
      </div>

      {/* Type filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {["all", ...TYPES].map((t) => (
          <button key={t} onClick={() => setActiveType(t as typeof activeType)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid", fontSize: 13, cursor: "pointer", transition: "all 0.15s",
              borderColor: activeType === t ? "var(--color-accent)" : "var(--color-border)",
              background: activeType === t ? "var(--color-accent)" : "transparent",
              color: activeType === t ? "white" : "var(--color-text-muted)" }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
          <Loader2 size={24} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!isLoading && !data?.length && (
        <div style={{ textAlign: "center", paddingTop: 60, color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: 15 }}>No entities yet.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Start capturing notes — people, companies, and projects are extracted automatically.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {data?.map(({ entity, noteCount }) => {
          const Icon = TYPE_ICONS[entity.type];
          const color = TYPE_COLORS[entity.type];
          return (
            <div key={entity.id} onClick={() => router.push(`/entities/${entity.id}`)}
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={color} />
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                  {noteCount} {noteCount === 1 ? "note" : "notes"}
                </span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{entity.name}</p>
                {entity.description && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {entity.description}
                  </p>
                )}
              </div>
              <div style={{ fontSize: 11, color, fontWeight: 500 }}>{entity.type}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
