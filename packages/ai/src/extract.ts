/**
 * AI extraction pipeline — runs after a note is saved.
 * Extracts: type, entities, tags, summary, key points, tasks.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { NoteType, EntityType } from "@repo/types";

const client = new Anthropic();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ExtractedEntitySchema = z.object({
  name: z.string(),
  type: z.enum(["person", "company", "project", "topic", "place"]),
  mentionedAs: z.string(),
});

const ExtractedTaskSchema = z.object({
  title: z.string(),
  context: z.string().describe("1 sentence: why this task matters"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

const ExtractionResultSchema = z.object({
  noteType: z
    .enum(["text", "link", "voice", "task", "meeting", "file", "highlight"])
    .describe("Best classification of this note"),
  summary: z.string().describe("1-2 sentence summary"),
  keyPoints: z.array(z.string()).describe("Up to 5 key points, if applicable"),
  tags: z.array(z.string()).describe("3-7 lowercase tags"),
  entities: z.array(ExtractedEntitySchema),
  tasks: z.array(ExtractedTaskSchema).describe("Action items found in content"),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;

// ─── Main extraction function ─────────────────────────────────────────────────

export async function extractNoteIntelligence(
  content: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  const context = sourceUrl ? `\nSource URL: ${sourceUrl}` : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [
      {
        name: "extract_note_data",
        description: "Extract structured intelligence from a note",
        input_schema: {
          type: "object" as const,
          properties: {
            noteType: {
              type: "string",
              enum: ["text", "link", "voice", "task", "meeting", "file", "highlight"],
              description: "Best classification of this note",
            },
            summary: { type: "string", description: "1-2 sentence summary" },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "Up to 5 key points",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "3-7 lowercase single-word or hyphenated tags",
            },
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["person", "company", "project", "topic", "place"] },
                  mentionedAs: { type: "string" },
                },
                required: ["name", "type", "mentionedAs"],
              },
            },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  context: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                },
                required: ["title", "context", "priority"],
              },
            },
          },
          required: ["noteType", "summary", "keyPoints", "tags", "entities", "tasks"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "extract_note_data" },
    messages: [
      {
        role: "user",
        content: `Extract structured intelligence from this note.${context}\n\n---\n${content}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI extraction did not return tool use");
  }

  return ExtractionResultSchema.parse(toolUse.input);
}
