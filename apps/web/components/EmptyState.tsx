"use client";

import { useRouter } from "next/navigation";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  const router = useRouter();
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      paddingBottom: 80,
      gap: 12,
      textAlign: "center",
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        marginBottom: 4,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text)" }}>{title}</p>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", maxWidth: 300, lineHeight: 1.6 }}>{description}</p>
      {action && (
        <button
          type="button"
          onClick={() => router.push(action.href)}
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: "var(--color-accent)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
          }}
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={() => router.push(secondaryAction.href)}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
