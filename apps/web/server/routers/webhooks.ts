import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { webhooks } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import crypto from "crypto";

const VALID_EVENTS = [
  "note.created",
  "note.updated",
  "note.deleted",
  "task.created",
  "task.completed",
] as const;

export const webhooksRouter = router({
  // ── List all webhooks for the user ────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(eq(webhooks.userId, ctx.user.id))
      .orderBy(desc(webhooks.createdAt));

    return rows;
  }),

  // ── Create a webhook ──────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.enum(VALID_EVENTS)).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const secret = crypto.randomBytes(24).toString("hex");

      const [webhook] = await db
        .insert(webhooks)
        .values({
          userId: ctx.user.id,
          url: input.url,
          events: input.events,
          secret,
          active: true,
        })
        .returning();

      return webhook!;
    }),

  // ── Delete a webhook ──────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(webhooks)
        .where(
          and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id))
        );
      return { success: true };
    }),

  // ── Toggle active/inactive ────────────────────────────────────────────────
  toggle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch current state
      const [existing] = await db
        .select({ active: webhooks.active })
        .from(webhooks)
        .where(
          and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id))
        );
      if (!existing) throw new Error("Webhook not found");

      const [updated] = await db
        .update(webhooks)
        .set({ active: !existing.active })
        .where(
          and(eq(webhooks.id, input.id), eq(webhooks.userId, ctx.user.id))
        )
        .returning({ id: webhooks.id, active: webhooks.active });

      return updated!;
    }),
});
