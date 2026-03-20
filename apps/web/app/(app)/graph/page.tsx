"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type EntityType = "person" | "company" | "project" | "topic" | "place" | string;

const NODE_COLOR: Record<string, string> = {
  person: "#6366f1",
  company: "#f59e0b",
  project: "#10b981",
  topic: "#8b5cf6",
  location: "#ec4899",
  place: "#ec4899",
  other: "#6b7280",
};

function nodeColor(type: EntityType): string {
  return NODE_COLOR[type] ?? NODE_COLOR.other;
}

type EntityRow = {
  entity: {
    id: string;
    name: string;
    type: EntityType;
    summary?: string | null;
    createdAt: Date | string;
  };
  noteCount: number;
};

export default function GraphPage() {
  const { data: rows, isLoading } = trpc.entities.list.useQuery({});
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entities: EntityRow[] = rows ?? [];
  const selected = entities.find((r) => r.entity.id === selectedId) ?? null;

  const SVG_W = 700;
  const SVG_H = 560;
  const CX = SVG_W / 2;
  const CY = SVG_H / 2;
  const RADIUS = 200;
  const MIN_NODE = 14;
  const MAX_NODE = 34;

  const maxNotes = Math.max(1, ...entities.map((r) => r.noteCount));

  // Arrange entities in a circle
  const positioned = entities.map((row, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, entities.length) - Math.PI / 2;
    const x = CX + RADIUS * Math.cos(angle);
    const y = CY + RADIUS * Math.sin(angle);
    const r = MIN_NODE + ((row.noteCount / maxNotes) * (MAX_NODE - MIN_NODE));
    return { ...row, x, y, r };
  });

  // Group by type for edges — connect entities of the same type
  const typeGroups: Record<string, typeof positioned> = {};
  for (const node of positioned) {
    const t = node.entity.type;
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(node);
  }

  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (const group of Object.values(typeGroups)) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${a.entity.id}-${b.entity.id}` });
      }
    }
  }

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 80px)", overflow: "hidden" }}>
      {/* Graph area — 2/3 */}
      <div
        style={{
          flex: "0 0 66.666%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 28px 16px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Relationship Graph</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            {entities.length} entities · Nodes sized by note count · Click a node to explore
          </p>
        </div>

        {isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
            Loading graph…
          </div>
        ) : entities.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "var(--color-text-muted)" }}>
            <p style={{ fontSize: 15, fontWeight: 500 }}>No entities yet</p>
            <p style={{ fontSize: 13 }}>Capture notes to populate the graph.</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px 20px" }}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: "100%", maxWidth: SVG_W, height: "auto" }}
              aria-label="Entity relationship graph"
            >
              {/* Edges */}
              <g aria-hidden="true">
                {edges.map((e) => (
                  <line
                    key={e.key}
                    x1={e.x1}
                    y1={e.y1}
                    x2={e.x2}
                    y2={e.y2}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                ))}
              </g>

              {/* Nodes */}
              {positioned.map((node) => {
                const isSelected = node.entity.id === selectedId;
                const color = nodeColor(node.entity.type);
                const labelY = node.y + node.r + 13;
                return (
                  <g
                    key={node.entity.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.entity.name}, ${node.entity.type}, ${node.noteCount} notes`}
                    aria-pressed={isSelected}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedId(isSelected ? null : node.entity.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(isSelected ? null : node.entity.id);
                      }
                    }}
                  >
                    {/* Glow ring when selected */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r + 6}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.5}
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r}
                      fill={color}
                      fillOpacity={isSelected ? 1 : 0.75}
                      stroke={color}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text
                      x={node.x}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--color-text-muted)"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.entity.name.length > 14
                        ? node.entity.name.slice(0, 13) + "…"
                        : node.entity.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Legend */}
        <div style={{ padding: "0 28px 20px", display: "flex", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(NODE_COLOR)
            .filter(([k]) => k !== "other" && k !== "place")
            .map(([type, color]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--color-text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} aria-hidden="true" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
        </div>
      </div>

      {/* Side panel — 1/3 */}
      <div style={{ flex: "0 0 33.333%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selected ? (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: nodeColor(selected.entity.type),
                  flexShrink: 0,
                }}
              />
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{selected.entity.name}</h2>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3, textTransform: "capitalize" }}>
                  {selected.entity.type}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: nodeColor(selected.entity.type) }}>
                  {selected.noteCount}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Notes</p>
              </div>
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text)", textTransform: "capitalize" }}>
                  {selected.entity.type}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Type</p>
              </div>
            </div>

            {/* Summary */}
            {selected.entity.summary && (
              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Summary</p>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text)" }}>{selected.entity.summary}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => router.push(`/entities/${selected.entity.id}`)}
                style={{ padding: "10px 16px", borderRadius: 8, background: nodeColor(selected.entity.type), color: "#fff", border: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "center" }}
              >
                View full profile
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                style={{ padding: "10px 16px", borderRadius: 8, background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", fontSize: 14, cursor: "pointer", textAlign: "center" }}
              >
                Deselect
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--color-text-muted)", padding: 28, textAlign: "center" }}>
            <div
              aria-hidden="true"
              style={{ width: 48, height: 48, borderRadius: "50%", border: "2px dashed var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}
            >
              <span style={{ fontSize: 22 }}>⬡</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500 }}>Select an entity</p>
            <p style={{ fontSize: 13 }}>Click any node in the graph to see its details here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
