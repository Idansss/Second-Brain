import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { collections, collectionNotes, notes } from "@repo/db";
import { eq, and, desc, count } from "drizzle-orm";

import { db } from "../db";

export const collectionsRouter = router({
  // ── List all collections for user with note count ──────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        description: collections.description,
        emoji: collections.emoji,
        parentId: collections.parentId,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        noteCount: count(collectionNotes.noteId),
      })
      .from(collections)
      .leftJoin(
        collectionNotes,
        eq(collections.id, collectionNotes.collectionId)
      )
      .where(eq(collections.userId, ctx.user.id))
      .groupBy(
        collections.id,
        collections.userId,
        collections.name,
        collections.description,
        collections.emoji,
        collections.parentId,
        collections.createdAt,
        collections.updatedAt
      )
      .orderBy(desc(collections.createdAt));

    return rows;
  }),

  // ── Create a collection ────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        emoji: z.string().optional(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If parentId given, verify it belongs to user
      if (input.parentId) {
        const [parent] = await db
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.id, input.parentId),
              eq(collections.userId, ctx.user.id)
            )
          );
        if (!parent) throw new Error("Parent collection not found");
      }

      const [collection] = await db
        .insert(collections)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          emoji: input.emoji,
          parentId: input.parentId ?? null,
        })
        .returning();
      return collection!;
    }),

  // ── Update a collection ────────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        emoji: z.string().optional(),
        parentId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If parentId given, verify it belongs to user and isn't itself
      if (input.parentId) {
        if (input.parentId === input.id) throw new Error("A collection cannot be its own parent");
        const [parent] = await db
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.id, input.parentId),
              eq(collections.userId, ctx.user.id)
            )
          );
        if (!parent) throw new Error("Parent collection not found");
      }

      const [updated] = await db
        .update(collections)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.emoji !== undefined && { emoji: input.emoji }),
          ...(input.parentId !== undefined && { parentId: input.parentId }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id))
        )
        .returning();
      return updated!;
    }),

  // ── Delete a collection (cascades to collection_notes) ─────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      db
        .delete(collections)
        .where(
          and(eq(collections.id, input.id), eq(collections.userId, ctx.user.id))
        )
    ),

  // ── Add a note to a collection ─────────────────────────────────────────────
  addNote: protectedProcedure
    .input(z.object({ collectionId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify collection belongs to user
      const [collection] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, input.collectionId),
            eq(collections.userId, ctx.user.id)
          )
        );
      if (!collection) throw new Error("Collection not found");

      await db
        .insert(collectionNotes)
        .values({ collectionId: input.collectionId, noteId: input.noteId })
        .onConflictDoNothing();

      return { success: true };
    }),

  // ── Remove a note from a collection ───────────────────────────────────────
  removeNote: protectedProcedure
    .input(z.object({ collectionId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify collection belongs to user
      const [collection] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, input.collectionId),
            eq(collections.userId, ctx.user.id)
          )
        );
      if (!collection) throw new Error("Collection not found");

      await db
        .delete(collectionNotes)
        .where(
          and(
            eq(collectionNotes.collectionId, input.collectionId),
            eq(collectionNotes.noteId, input.noteId)
          )
        );

      return { success: true };
    }),

  // ── Get all notes in a collection ─────────────────────────────────────────
  notes: protectedProcedure
    .input(z.object({ collectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify collection belongs to user
      const [collection] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, input.collectionId),
            eq(collections.userId, ctx.user.id)
          )
        );
      if (!collection) throw new Error("Collection not found");

      const rows = await db
        .select({
          id: notes.id,
          userId: notes.userId,
          type: notes.type,
          content: notes.content,
          contentMarkdown: notes.contentMarkdown,
          sourceUrl: notes.sourceUrl,
          sourceTitle: notes.sourceTitle,
          status: notes.status,
          metadata: notes.metadata,
          embedding: notes.embedding,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
          addedAt: collectionNotes.addedAt,
        })
        .from(collectionNotes)
        .innerJoin(notes, eq(collectionNotes.noteId, notes.id))
        .where(eq(collectionNotes.collectionId, input.collectionId))
        .orderBy(desc(collectionNotes.addedAt));

      return rows;
    }),
});
