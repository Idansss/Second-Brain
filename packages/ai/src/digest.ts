/**
 * Daily digest generator — AI-synthesized summary of recent activity.
 * Surfaces: open tasks, stale threads, relevant ideas, and resurfaced notes.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Note, Task } from "@repo/types";

const client = new Anthropic();

export interface DigestInput {
  recentNotes: Note[];
  prevWeekNotes: Note[];
  openTasks: Task[];
  userName: string;
}

export interface DigestOutput {
  greeting: string;
  summary: string;
  openLoops: string[];
  resurfacedNotes: Array<{ noteId: string; reason: string }>;
  suggestedFocus: string;
  highlights: string[];
  trends: Array<{ topic: string; direction: "rising" | "falling" | "new"; detail: string }>;
  weekStats: { notesThisWeek: number; notesDelta: number; topTopics: string[] };
}

export async function generateDailyDigest(
  input: DigestInput
): Promise<DigestOutput> {
  const notesContext = input.recentNotes
    .map(
      (n) =>
        `- [${n.id}] (${n.createdAt.toLocaleDateString()}) ${n.sourceTitle ?? n.content.slice(0, 100)}`
    )
    .join("\n");

  const prevWeekContext = input.prevWeekNotes
    .map((n) => `- ${n.sourceTitle ?? n.content.slice(0, 80)}`)
    .join("\n");

  const tasksContext = input.openTasks
    .map((t) => `- [${t.id}] ${t.title} (${t.priority} priority)`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [
      {
        name: "create_digest",
        description: "Create a personalized daily digest",
        input_schema: {
          type: "object" as const,
          properties: {
            greeting: { type: "string", description: "Short personalized greeting" },
            summary: { type: "string", description: "2-3 sentence overview of recent activity" },
            openLoops: {
              type: "array",
              items: { type: "string" },
              description: "Unresolved threads, decisions, or follow-ups worth attention",
            },
            resurfacedNotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  noteId: { type: "string" },
                  reason: { type: "string", description: "Why this note matters today" },
                },
                required: ["noteId", "reason"],
              },
            },
            suggestedFocus: {
              type: "string",
              description: "One thing the user should focus on today",
            },
            highlights: {
              type: "array",
              items: { type: "string" },
              description: "2-3 key insights or notable moments from this week's notes",
            },
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  direction: { type: "string", enum: ["rising", "falling", "new"] },
                  detail: { type: "string", description: "One sentence explaining the trend" },
                },
                required: ["topic", "direction", "detail"],
              },
              description: "Topics that are rising, falling, or newly appearing compared to the previous week",
            },
            weekStats: {
              type: "object",
              properties: {
                notesThisWeek: { type: "number" },
                notesDelta: { type: "number", description: "Change vs previous week (positive = more)" },
                topTopics: { type: "array", items: { type: "string" }, description: "Top 3 topics this week" },
              },
              required: ["notesThisWeek", "notesDelta", "topTopics"],
            },
          },
          required: ["greeting", "summary", "openLoops", "resurfacedNotes", "suggestedFocus", "highlights", "trends", "weekStats"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "create_digest" },
    messages: [
      {
        role: "user",
        content: `Generate a daily digest for ${input.userName}.

This week's notes (last 7 days) — ${input.recentNotes.length} notes:
${notesContext || "No recent notes."}

Previous week's notes (for trend comparison) — ${input.prevWeekNotes.length} notes:
${prevWeekContext || "No notes from the previous week."}

Open tasks:
${tasksContext || "No open tasks."}

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Identify trends by comparing this week vs previous week topics. For weekStats.notesDelta: positive means more notes this week than last week.`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI digest generation failed");
  }

  return toolUse.input as DigestOutput;
}
