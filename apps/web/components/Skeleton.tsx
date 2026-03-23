"use client";

export function Skeleton({ width, height = 14, borderRadius = 6, style }: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width: width ?? "100%",
      height,
      borderRadius,
      background: "var(--color-surface-2)",
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(90deg, transparent 0%, var(--color-border) 50%, transparent 100%)",
        animation: "shimmer 1.4s ease infinite",
      }} />
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 10,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={60} height={10} />
      </div>
      <Skeleton height={13} />
      <Skeleton width="80%" height={13} />
      <Skeleton width="60%" height={13} />
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <Skeleton width={48} height={18} borderRadius={20} />
        <Skeleton width={48} height={18} borderRadius={20} />
      </div>
    </div>
  );
}

export function TaskRowSkeleton() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 0",
      borderBottom: "1px solid var(--color-border)",
    }}>
      <Skeleton width={18} height={18} borderRadius={18} />
      <Skeleton height={14} />
      <Skeleton width={60} height={11} style={{ flexShrink: 0 }} />
    </div>
  );
}

export function HomeStatSkeleton() {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton width={40} height={22} />
        <Skeleton width={80} height={12} />
      </div>
    </div>
  );
}
