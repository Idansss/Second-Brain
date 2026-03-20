import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notes, entities, noteEntities } from "@repo/db";
import { embedText } from "@repo/ai";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

import { db } from "../db";
const anthropic = new Anthropic();

export const intelligenceRouter = router({
  // ── Stale Topics ───────────────────────────────────────────────────────────
  staleTopics: protectedProcedure.query(async ({ ctx }) => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        entity: entities,
        lastSeen: sql<Date>`max(${notes.createdAt})`,
        noteCount: sql<number>`count(${noteEntities.noteId})::int`,
      })
      .from(entities)
      .innerJoin(noteEntities, eq(noteEntities.entityId, entities.id))
      .innerJoin(notes, eq(notes.id, noteEntities.noteId))
      .where(
        and(
          eq(entities.userId, ctx.user.id),
          eq(notes.status, "active")
        )
      )
      .groupBy(entities.id)
      .having(lt(sql`max(${notes.createdAt})`, fourteenDaysAgo))
      .orderBy(desc(sql`max(${notes.createdAt})`))
      .limit(10);

    return rows.map((row) => ({
      entity: row.entity,
      lastSeen: row.lastSeen,
      noteCount: row.noteCount,
      suggestedAction: `Revisit your notes about ${row.entity.name} — you haven't mentioned them in a while.`,
    }));
  }),

  // ── Weekly Digest ──────────────────────────────────────────────────────────
  weeklyDigest: protectedProcedure.mutation(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentNotes = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, ctx.user.id),
          eq(notes.status, "active"),
          sql`${notes.createdAt} >= ${sevenDaysAgo}`
        )
      )
      .orderBy(desc(notes.createdAt))
      .limit(50);

    if (recentNotes.length === 0) {
      return {
        weekOf: sevenDaysAgo.toISOString().split("T")[0],
        themes: [],
        accomplishments: [],
        patterns: [],
        nextWeekFocus: [],
        rawSummary: "No notes captured this week.",
      };
    }

    const notesSummary = recentNotes
      .map((n, i) => {
        const meta = (n.metadata ?? {}) as Record<string, unknown>;
        const summary = meta.summary as string | undefined;
        return `Note ${i + 1} (${n.type}, ${new Date(n.createdAt).toLocaleDateString()}): ${summary ?? n.content.slice(0, 200)}`;
      })
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a personal knowledge assistant. Based on these notes from the past week, provide a structured weekly synthesis.

Notes:
${notesSummary}

Respond with a JSON object with these fields:
- themes: string[] (3-5 key themes from this week)
- accomplishments: string[] (notable things captured/completed)
- patterns: string[] (recurring topics or patterns you notice)
- nextWeekFocus: string[] (2-3 suggestions for what to focus on next week)
- rawSummary: string (a 2-3 sentence narrative summary)

Return only valid JSON, no markdown.`,
        },
      ],
    });

    const content = message.content[0];
    let parsed = {
      themes: [] as string[],
      accomplishments: [] as string[],
      patterns: [] as string[],
      nextWeekFocus: [] as string[],
      rawSummary: "",
    };

    try {
      if (content?.type === "text") {
        parsed = JSON.parse(content.text);
      }
    } catch {
      parsed.rawSummary =
        content?.type === "text" ? content.text : "Could not parse weekly summary.";
    }

    return {
      weekOf: sevenDaysAgo.toISOString().split("T")[0],
      ...parsed,
    };
  }),

  // ── Pre-Meeting Brief ──────────────────────────────────────────────────────
  preMeetingBrief: protectedProcedure
    .input(z.object({ topic: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const embedding = await embedText(input.topic);
      const embeddingStr = `[${embedding.join(",")}]`;

      const results = await db.execute(sql`
        SELECT id, content, source_title, source_url, created_at, type,
               1 - (embedding <=> ${embeddingStr}::vector) AS score
        FROM notes
        WHERE user_id = ${ctx.user.id}
          AND status = 'active'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT 5
      `);

      const relatedNotes = results as unknown as Array<{
        id: string;
        content: string;
        source_title: string | null;
        source_url: string | null;
        created_at: Date;
        type: string;
        score: number;
      }>;

      const context =
        relatedNotes.length > 0
          ? `Here's what you know about ${input.topic}: ${relatedNotes
              .map((n) => n.source_title ?? n.content.slice(0, 100))
              .join("; ")}`
          : `No notes found about ${input.topic} yet.`;

      return {
        topic: input.topic,
        notes: relatedNotes,
        context,
      };
    }),

  // ── Chat with Notes ────────────────────────────────────────────────────────
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        history: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Embed the user message to find relevant notes
      const embedding = await embedText(input.message);
      const embeddingStr = `[${embedding.join(",")}]`;

      const results = await db.execute(sql`
        SELECT id, content, source_title, created_at, type,
               1 - (embedding <=> ${embeddingStr}::vector) AS score
        FROM notes
        WHERE user_id = ${ctx.user.id}
          AND status = 'active'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT 6
      `);

      const relatedNotes = results as unknown as Array<{
        id: string;
        content: string;
        source_title: string | null;
        created_at: string;
        type: string;
        score: number;
      }>;

      const notesContext =
        relatedNotes.length > 0
          ? relatedNotes
              .map((n, i) => {
                const title = n.source_title ?? `Note ${i + 1}`;
                const preview = n.content.slice(0, 400);
                return `[${title}]: ${preview}`;
              })
              .join("\n\n")
          : "No relevant notes found in the Second Brain.";

      // Build messages array for Claude
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...input.history,
        { role: "user", content: input.message },
      ];

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `You are a personal AI assistant for a Second Brain knowledge management app. Your job is to help the user explore, synthesize, and make sense of their personal notes.

Here are the most relevant notes from the user's Second Brain for their current question:

${notesContext}

Guidelines:
- Answer conversationally and helpfully based on the user's notes
- Reference specific notes when relevant (use their titles)
- If the notes don't contain enough information, say so honestly
- Be concise but thorough
- Don't make up information not found in the notes`,
        messages,
      });

      const content = response.content[0];
      const reply = content?.type === "text" ? content.text : "I couldn't generate a response.";

      return {
        reply,
        sourcedNotes: relatedNotes.map((n) => ({
          id: n.id,
          title: n.source_title ?? n.content.slice(0, 50),
          type: n.type,
          score: n.score,
        })),
      };
    }),

  // ── Suggest Tags ───────────────────────────────────────────────────────────
  suggestTags: protectedProcedure
    .input(z.object({ content: z.string().min(50) }))
    .mutation(async ({ input }) => {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Extract 3-5 relevant tags for this note. Return ONLY a JSON array of lowercase strings, no explanation, no markdown.

Note content:
${input.content.slice(0, 2000)}`,
          },
        ],
      });

      const content = response.content[0];
      if (content?.type !== "text") return { tags: [] };

      try {
        // Strip any accidental markdown code fences
        const cleaned = content.text.replace(/```json?|```/g, "").trim();
        const tags = JSON.parse(cleaned) as string[];
        return { tags: Array.isArray(tags) ? tags.slice(0, 5) : [] };
      } catch {
        return { tags: [] };
      }
    }),

  // ── Meeting Summary ────────────────────────────────────────────────────────
  meetingSummary: protectedProcedure
    .input(z.object({ transcript: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `You are an expert meeting analyst. Analyze this meeting transcript and extract structured information.

Transcript:
${input.transcript.slice(0, 8000)}

Return a JSON object with exactly these fields:
- summary: string (2-4 sentence executive summary of the meeting)
- actionItems: string[] (specific tasks assigned, each starting with a verb)
- decisions: string[] (key decisions made during the meeting)
- attendees: string[] (names of people who spoke or were mentioned)

Return ONLY valid JSON, no markdown, no explanation.`,
          },
        ],
      });

      const content = response.content[0];
      if (content?.type !== "text") {
        return { summary: "", actionItems: [], decisions: [], attendees: [] };
      }

      try {
        const cleaned = content.text.replace(/```json?|```/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          summary: string;
          actionItems: string[];
          decisions: string[];
          attendees: string[];
        };
        return {
          summary: parsed.summary ?? "",
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
        };
      } catch {
        return {
          summary: content.text,
          actionItems: [],
          decisions: [],
          attendees: [],
        };
      }
    }),
});
