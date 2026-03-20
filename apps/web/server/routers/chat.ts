import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notes } from "@repo/db";
import { embedText, chatWithNotes } from "@repo/ai";
import { eq, and, sql, ilike, or } from "drizzle-orm";

import { db } from "../db";

export const chatRouter = router({
  ask: protectedProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      let contextNotes: Array<{
        id: string; content: string; sourceTitle: string | null;
        createdAt: Date; userId: string; type: "text"; status: "active";
        contentMarkdown: null; sourceUrl: null; metadata: {}; updatedAt: Date;
      }> = [];

      // Try vector search first
      try {
        const embedding = await embedText(input.question);
        const embeddingStr = `[${embedding.join(",")}]`;
        const rows = await db.execute(sql`
          SELECT id, content, source_title, created_at
          FROM notes
          WHERE user_id = ${ctx.user.id}
            AND status = 'active'
            AND embedding IS NOT NULL
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT 8
        `);
        contextNotes = (rows as unknown as Array<{
          id: string; content: string; source_title: string | null; created_at: Date;
        }>).map((r) => ({
          id: r.id, content: r.content, sourceTitle: r.source_title,
          createdAt: new Date(r.created_at), userId: ctx.user.id,
          type: "text" as const, status: "active" as const,
          contentMarkdown: null, sourceUrl: null, metadata: {}, updatedAt: new Date(r.created_at),
        }));
      } catch {
        // Vector search unavailable — fall through to keyword search
      }

      // Fallback: keyword search if no vector results
      if (contextNotes.length === 0) {
        const keywords = input.question.split(" ").filter((w) => w.length > 3).slice(0, 4);
        if (keywords.length > 0) {
          const keywordRows = await db
            .select({ id: notes.id, content: notes.content, sourceTitle: notes.sourceTitle, createdAt: notes.createdAt })
            .from(notes)
            .where(and(
              eq(notes.userId, ctx.user.id),
              eq(notes.status, "active"),
              or(...keywords.map((kw) => ilike(notes.content, `%${kw}%`)))
            ))
            .limit(8);
          contextNotes = keywordRows.map((r) => ({
            ...r, userId: ctx.user.id, type: "text" as const, status: "active" as const,
            contentMarkdown: null, sourceUrl: null, metadata: {}, updatedAt: r.createdAt,
          }));
        }
      }

      // If still no notes, use most recent ones as context
      if (contextNotes.length === 0) {
        const recent = await db
          .select({ id: notes.id, content: notes.content, sourceTitle: notes.sourceTitle, createdAt: notes.createdAt })
          .from(notes)
          .where(and(eq(notes.userId, ctx.user.id), eq(notes.status, "active")))
          .orderBy(sql`created_at DESC`)
          .limit(6);
        contextNotes = recent.map((r) => ({
          ...r, userId: ctx.user.id, type: "text" as const, status: "active" as const,
          contentMarkdown: null, sourceUrl: null, metadata: {}, updatedAt: r.createdAt,
        }));
      }

      let answer = "";
      for await (const chunk of chatWithNotes(input.question, { notes: contextNotes })) {
        answer += chunk;
      }

      return {
        answer,
        sources: contextNotes.map((n) => ({
          id: n.id,
          title: n.sourceTitle ?? n.content.slice(0, 60),
          createdAt: n.createdAt,
        })),
      };
    }),
});
