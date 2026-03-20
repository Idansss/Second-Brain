import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { apiTokens } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const apiTokensRouter = router({
  // ── List all tokens for the user (never return the raw token) ─────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        createdAt: apiTokens.createdAt,
        lastUsedAt: apiTokens.lastUsedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.userId, ctx.user.id))
      .orderBy(desc(apiTokens.createdAt));

    return rows;
  }),

  // ── Create a new token — returns the raw token ONCE ───────────────────────
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);

      const [token] = await db
        .insert(apiTokens)
        .values({
          userId: ctx.user.id,
          name: input.name,
          tokenHash,
        })
        .returning({
          id: apiTokens.id,
          name: apiTokens.name,
          createdAt: apiTokens.createdAt,
        });

      return { ...token!, rawToken };
    }),

  // ── Revoke (delete) a token ────────────────────────────────────────────────
  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(apiTokens)
        .where(
          and(eq(apiTokens.id, input.id), eq(apiTokens.userId, ctx.user.id))
        );
      return { success: true };
    }),
});
