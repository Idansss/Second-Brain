export const colors = {
  background: "#0a0a0a",
  surface: "#111111",
  surfaceAlt: "#1a1a1a",
  border: "#2a2a2a",
  text: "#f0f0f0",
  textMuted: "#888888",
  accent: "#6366f1",
  accentLight: "#818cf8",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#6366f1",
  low: "#6b7280",
} as const;

export const priorityColor: Record<string, string> = {
  urgent: colors.urgent,
  high: colors.high,
  medium: colors.medium,
  low: colors.low,
};

export const noteTypeEmoji: Record<string, string> = {
  text: "📝",
  link: "🔗",
  voice: "🎙️",
  task: "✅",
  meeting: "📅",
  file: "📎",
  highlight: "✨",
};
