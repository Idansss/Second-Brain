import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notes } from "@repo/db";
import { embedText, chatWithNotes } from "@repo/ai";
import { eq, and, sql } from "drizzle-orm";

import { db } from "../db";

export const chatRouter = router({
  // Returns a streaming response via readable stream
  ask: protectedProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const embedding = await embedText(input.question);
      const embeddingStr = `[${embedding.join(",")}]`;

      // Retrieve top 8 semantically relevant notes
      const rows = await db.execute(sql`
        SELECT id, content, source_title, created_at
        FROM notes
        WHERE user_id = ${ctx.user.id}
          AND status = 'active'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT 8
      `);

      const contextNotes = (rows as unknown as Array<{
        id: string;
        content: string;
        source_title: string | null;
        created_at: Date;
      }>).map((r) => ({
        id: r.id,
        content: r.content,
        sourceTitle: r.source_title,
        createdAt: new Date(r.created_at),
        // Satisfy Note type — minimal fields needed for chat
        userId: ctx.user.id,
        type: "text" as const,
        status: "active" as const,
        contentMarkdown: null,
        sourceUrl: null,
        metadata: {},
        updatedAt: new Date(r.created_at),
      }));

      // Collect full response (streaming handled in UI via fetch directly)
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
