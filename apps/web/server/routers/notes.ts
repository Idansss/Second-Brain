import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { notes, noteVersions, tags, noteTags, entities, noteEntities } from "@repo/db";
import { extractNoteIntelligence, embedText, scrapeUrl } from "@repo/ai";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

import { db } from "../db";

export const notesRouter = router({
  // ── List all active notes ──────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
        type: z.enum(["text", "link", "voice", "task", "meeting", "file", "highlight"]).optional(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(notes.userId, ctx.user.id),
        eq(notes.status, "active"),
      ];
      if (input.type) conditions.push(eq(notes.type, input.type));

      if (input.tag) {
        // Find note IDs that have the given tag
        const taggedNoteIds = await db
          .select({ noteId: noteTags.noteId })
          .from(noteTags)
          .innerJoin(tags, eq(noteTags.tagId, tags.id))
          .where(and(eq(tags.userId, ctx.user.id), eq(tags.name, input.tag)));

        const ids = taggedNoteIds.map((r) => r.noteId);
        if (ids.length === 0) return [];
        conditions.push(inArray(notes.id, ids));
      }

      return db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(desc(notes.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── List tags with note counts ─────────────────────────────────────────────
  listTags: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        name: tags.name,
        count: sql<number>`cast(count(${noteTags.noteId}) as int)`,
      })
      .from(tags)
      .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
      .innerJoin(notes, and(eq(noteTags.noteId, notes.id), eq(notes.status, "active")))
      .where(eq(tags.userId, ctx.user.id))
      .groupBy(tags.name)
      .orderBy(desc(sql`count(${noteTags.noteId})`));

    return rows;
  }),

  // ── Get single note ────────────────────────────────────────────────────────
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)));
      if (!note) throw new Error("Note not found");
      return note;
    }),

  // ── Create note (capture) ──────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        content: z.string().default(""),
        url: z.string().url().optional(),
        type: z
          .enum(["text", "link", "voice", "task", "meeting", "file", "highlight"])
          .default("text"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let content = input.content;
      let sourceTitle: string | undefined;
      let metadata: Record<string, unknown> = {};

      // If URL provided, scrape it
      if (input.url) {
        const scraped = await scrapeUrl(input.url);
        content = content || scraped.content;
        sourceTitle = scraped.title;
        metadata = {
          ogDescription: scraped.ogDescription,
          ogImage: scraped.ogImage,
        };
      }

      // Save note immediately (fast capture)
      const [note] = await db
        .insert(notes)
        .values({
          userId: ctx.user.id,
          type: input.type,
          content,
          sourceUrl: input.url,
          sourceTitle,
          metadata,
        })
        .returning();

      // AI pipeline runs async — don't await it
      processNoteAsync(note!.id, content, ctx.user.id, input.url).catch(
        console.error
      );

      return note!;
    }),

  // ── Update note ────────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().optional(),
        status: z.enum(["active", "archived", "deleted"]).optional(),
        imageUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(notes)
        .set({
          ...(input.content !== undefined && { content: input.content }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.imageUrls !== undefined && { imageUrls: input.imageUrls }),
          updatedAt: new Date(),
        })
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)))
        .returning();
      return updated!;
    }),

  // ── Semantic search with keyword fallback ─────────────────────────────────
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(10),
        type: z.enum(["text", "link", "voice", "task", "meeting", "file", "highlight"]).optional(),
        dateRange: z.enum(["any", "today", "week", "month"]).default("any"),
        tags: z.array(z.string()).default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, limit, type, dateRange, tags: filterTags } = input;

      // ── Date filter ────────────────────────────────────────────────────────
      const now = new Date();
      let dateFrom: Date | null = null;
      if (dateRange === "today") {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === "week") {
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "month") {
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // ── Tag filter: collect note IDs that match ALL requested tags ─────────
      let tagFilterIds: string[] | null = null;
      if (filterTags.length > 0) {
        const taggedRows = await db
          .select({ noteId: noteTags.noteId })
          .from(noteTags)
          .innerJoin(tags, eq(noteTags.tagId, tags.id))
          .where(and(eq(tags.userId, ctx.user.id), inArray(tags.name, filterTags)));
        tagFilterIds = taggedRows.map((r) => r.noteId);
        if (tagFilterIds.length === 0) return [];
      }

      // Build optional SQL fragments
      const typeClause = type ? sql` AND type = ${type}` : sql``;
      const dateClause = dateFrom ? sql` AND created_at >= ${dateFrom.toISOString()}` : sql``;
      const tagClause =
        tagFilterIds !== null
          ? sql` AND id = ANY(${sql.raw(`ARRAY[${tagFilterIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`
          : sql``;

      // ── 1. Try semantic search ─────────────────────────────────────────────
      type RawRow = {
        id: string;
        content: string;
        source_title: string | null;
        source_url: string | null;
        created_at: Date;
        type: string;
        score: number;
        match_type: "semantic" | "keyword";
      };

      let semanticRows: RawRow[] = [];
      let embeddingFailed = false;

      try {
        const embedding = await embedText(query);
        const embeddingStr = `[${embedding.join(",")}]`;

        const sem = await db.execute(sql`
          SELECT id, content, source_title, source_url, created_at, type,
                 1 - (embedding <=> ${embeddingStr}::vector) AS score,
                 'semantic' AS match_type
          FROM notes
          WHERE user_id = ${ctx.user.id}
            AND status = 'active'
            AND embedding IS NOT NULL
            ${typeClause}
            ${dateClause}
            ${tagClause}
          ORDER BY embedding <=> ${embeddingStr}::vector
          LIMIT ${limit}
        `);
        semanticRows = sem as unknown as RawRow[];
      } catch {
        embeddingFailed = true;
      }

      // ── 2. Full-text keyword search (always run, merge with semantic) ───────
      const kwRows = await db.execute(sql`
        SELECT id, content, source_title, source_url, created_at, type,
               ts_rank(
                 to_tsvector('english', coalesce(source_title, '') || ' ' || content),
                 plainto_tsquery('english', ${query})
               ) AS score,
               'keyword' AS match_type
        FROM notes
        WHERE user_id = ${ctx.user.id}
          AND status = 'active'
          AND to_tsvector('english', coalesce(source_title, '') || ' ' || content)
              @@ plainto_tsquery('english', ${query})
          ${typeClause}
          ${dateClause}
          ${tagClause}
        ORDER BY score DESC
        LIMIT ${limit}
      `) as unknown as RawRow[];

      // ── 3. Merge — semantic results first, keyword-only after ───────────────
      const semanticIds = new Set(semanticRows.map((r) => r.id));
      const keywordOnly = kwRows.filter((r) => !semanticIds.has(r.id));
      const merged: RawRow[] = [
        ...semanticRows,
        ...keywordOnly.map((r) => ({ ...r, match_type: "keyword" as const })),
      ].slice(0, limit + 10);

      if (embeddingFailed) {
        return kwRows.map((r) => ({ ...r, match_type: "keyword" as const }));
      }

      return merged;
    }),

  // ── Archive / delete ───────────────────────────────────────────────────────
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      db
        .update(notes)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)))
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      db
        .update(notes)
        .set({ status: "deleted", updatedAt: new Date() })
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.user.id)))
    ),

  // ── Save a version snapshot ────────────────────────────────────────────────
  saveVersion: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        content: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));
      if (!note) throw new Error("Note not found");

      const [version] = await db
        .insert(noteVersions)
        .values({
          noteId: input.noteId,
          content: input.content,
          title: input.title ?? note.sourceTitle ?? null,
          userId: ctx.user.id,
        })
        .returning();

      return version!;
    }),

  // ── List versions for a note ───────────────────────────────────────────────
  listVersions: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));
      if (!note) throw new Error("Note not found");

      const versions = await db
        .select({
          id: noteVersions.id,
          noteId: noteVersions.noteId,
          title: noteVersions.title,
          savedAt: noteVersions.savedAt,
          // First 100 chars as preview
          preview: sql<string>`substring(${noteVersions.content}, 1, 100)`,
        })
        .from(noteVersions)
        .where(eq(noteVersions.noteId, input.noteId))
        .orderBy(desc(noteVersions.savedAt))
        .limit(50);

      return versions;
    }),

  // ── Get full content of a specific version ─────────────────────────────────
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string(), noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify note ownership
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));
      if (!note) throw new Error("Note not found");

      const [version] = await db
        .select()
        .from(noteVersions)
        .where(
          and(
            eq(noteVersions.id, input.versionId),
            eq(noteVersions.noteId, input.noteId)
          )
        );
      if (!version) throw new Error("Version not found");

      return version;
    }),

  // ── Restore a version (overwrite note content) ─────────────────────────────
  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify note ownership
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));
      if (!note) throw new Error("Note not found");

      const [version] = await db
        .select()
        .from(noteVersions)
        .where(
          and(
            eq(noteVersions.id, input.versionId),
            eq(noteVersions.noteId, input.noteId)
          )
        );
      if (!version) throw new Error("Version not found");

      // Save current state as a new version before restoring
      await db.insert(noteVersions).values({
        noteId: input.noteId,
        content: note.content,
        title: note.sourceTitle ?? null,
        userId: ctx.user.id,
      });

      // Restore the content
      const [updated] = await db
        .update(notes)
        .set({ content: version.content, updatedAt: new Date() })
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)))
        .returning();

      return updated!;
    }),
});

// ── Background AI processing ───────────────────────────────────────────────
async function processNoteAsync(
  noteId: string,
  content: string,
  userId: string,
  sourceUrl?: string
) {
  const [extracted, embedding] = await Promise.all([
    extractNoteIntelligence(content, sourceUrl),
    embedText(content),
  ]);

  // Update note with embedding + derived type
  await db
    .update(notes)
    .set({
      type: extracted.noteType,
      contentMarkdown: content,
      embedding,
      metadata: {
        summary: extracted.summary,
        keyPoints: extracted.keyPoints,
      },
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  // Upsert tags
  for (const tagName of extracted.tags) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.name, tagName)));

    const tagId = existing
      ? existing.id
      : (
          await db
            .insert(tags)
            .values({ userId, name: tagName, autoGenerated: true })
            .returning()
        )[0]!.id;

    await db.insert(noteTags).values({ noteId, tagId }).onConflictDoNothing();
  }

  // Upsert entities
  for (const ent of extracted.entities) {
    const [existing] = await db
      .select()
      .from(entities)
      .where(
        and(
          eq(entities.userId, userId),
          eq(entities.name, ent.name),
          eq(entities.type, ent.type)
        )
      );

    const entityId = existing
      ? existing.id
      : (
          await db
            .insert(entities)
            .values({ userId, name: ent.name, type: ent.type })
            .returning()
        )[0]!.id;

    await db
      .insert(noteEntities)
      .values({ noteId, entityId, mentionedAs: ent.mentionedAs })
      .onConflictDoNothing();
  }
}
