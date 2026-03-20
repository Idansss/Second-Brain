import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { tasks } from "@repo/db";
import { eq, and, desc, asc, isNull, or } from "drizzle-orm";

import { db } from "../db";

export const tasksRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.userId, ctx.user.id)];
      if (input.status) conditions.push(eq(tasks.status, input.status));

      return db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(asc(tasks.dueDate), desc(tasks.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        context: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        dueDate: z.string().datetime().optional(),
        sourceNoteId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await db
        .insert(tasks)
        .values({
          userId: ctx.user.id,
          title: input.title,
          context: input.context,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          sourceNoteId: input.sourceNoteId,
        })
        .returning();
      return task!;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const setFields: Record<string, unknown> = { updatedAt: new Date() };
      if (input.priority !== undefined) setFields.priority = input.priority;
      if (input.dueDate !== undefined)
        setFields.dueDate = input.dueDate ? new Date(input.dueDate) : null;

      const [updated] = await db
        .update(tasks)
        .set(setFields)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
        .returning();
      return updated!;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["todo", "in_progress", "done", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(tasks)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
        .returning();
      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      db
        .delete(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.userId, ctx.user.id)))
    ),
});
