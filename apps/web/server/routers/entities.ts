import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { entities, noteEntities, notes, tags, noteTags } from "@repo/db";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "../db";

export const entitiesRouter = router({
  // List all entities with note count
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["person", "company", "project", "topic", "place"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(entities.userId, ctx.user.id)];
      if (input.type) conditions.push(eq(entities.type, input.type));

      const rows = await db
        .select({
          entity: entities,
          noteCount: sql<number>`count(${noteEntities.noteId})::int`,
        })
        .from(entities)
        .leftJoin(noteEntities, eq(noteEntities.entityId, entities.id))
        .where(and(...conditions))
        .groupBy(entities.id)
        .orderBy(desc(sql`count(${noteEntities.noteId})`));

      return rows;
    }),

  // Get single entity with all related notes
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [entity] = await db
        .select()
        .from(entities)
        .where(and(eq(entities.id, input.id), eq(entities.userId, ctx.user.id)));

      if (!entity) throw new Error("Entity not found");

      // Get all notes that mention this entity
      const relatedNotes = await db
        .select({
          note: notes,
          mentionedAs: noteEntities.mentionedAs,
        })
        .from(noteEntities)
        .innerJoin(notes, eq(notes.id, noteEntities.noteId))
        .where(eq(noteEntities.entityId, input.id))
        .orderBy(desc(notes.createdAt));

      return { entity, relatedNotes };
    }),

  // Merge two entities (dedup)
  merge: protectedProcedure
    .input(z.object({ sourceId: z.string(), targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Re-point all note_entities from source to target
      await db
        .update(noteEntities)
        .set({ entityId: input.targetId })
        .where(eq(noteEntities.entityId, input.sourceId));

      // Delete the source entity
      await db
        .delete(entities)
        .where(and(eq(entities.id, input.sourceId), eq(entities.userId, ctx.user.id)));

      return { success: true };
    }),
});
