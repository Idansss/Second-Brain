import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { notes, userProfiles } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";

import { db } from "../db";

function generateToken(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export const sharingRouter = router({
  // ── Create Share Link ──────────────────────────────────────────────────────
  createShareLink: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the note belongs to the user
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));

      if (!note) throw new Error("Note not found");

      // Get or create user profile
      let [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id));

      if (!profile) {
        const [created] = await db
          .insert(userProfiles)
          .values({ id: ctx.user.id, email: ctx.user.email ?? "" })
          .returning();
        profile = created!;
      }

      const token = generateToken(8);
      const existingSettings = (profile.settings ?? {}) as Record<string, unknown>;
      const existingShareLinks = (existingSettings.shareLinks ?? {}) as Record<string, string>;

      await db
        .update(userProfiles)
        .set({
          settings: {
            ...existingSettings,
            shareLinks: {
              ...existingShareLinks,
              [token]: input.noteId,
            },
          } as typeof profile.settings,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, ctx.user.id));

      return { token };
    }),

  // ── Invite Collaborator ────────────────────────────────────────────────────
  inviteCollaborator: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      let [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id));

      if (!profile) {
        const [created] = await db
          .insert(userProfiles)
          .values({ id: ctx.user.id, email: ctx.user.email ?? "" })
          .returning();
        profile = created!;
      }

      const token = generateToken(24);
      const existingSettings = (profile.settings ?? {}) as Record<string, unknown>;
      const existingInvites = (existingSettings.pendingInvites ?? []) as Array<{
        email: string;
        token: string;
        createdAt: string;
      }>;

      const newInvite = {
        email: input.email,
        token,
        createdAt: new Date().toISOString(),
      };

      await db
        .update(userProfiles)
        .set({
          settings: {
            ...existingSettings,
            pendingInvites: [...existingInvites, newInvite],
          } as typeof profile.settings,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, ctx.user.id));

      return { token };
    }),

  // ── Accept Invite ──────────────────────────────────────────────────────────
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Scan all profiles for the invite token
      const allProfiles = await db.select().from(userProfiles);

      let inviterProfile: typeof allProfiles[number] | null = null;
      let inviteRecord: { email: string; token: string; createdAt: string } | null = null;

      for (const p of allProfiles) {
        const settings = (p.settings ?? {}) as Record<string, unknown>;
        const pending = (settings.pendingInvites ?? []) as Array<{
          email: string;
          token: string;
          createdAt: string;
        }>;
        const found = pending.find((inv) => inv.token === input.token);
        if (found) {
          inviterProfile = p;
          inviteRecord = found;
          break;
        }
      }

      if (!inviterProfile || !inviteRecord) {
        throw new Error("Invite token not found or already used");
      }

      if (inviterProfile.id === ctx.user.id) {
        throw new Error("Cannot accept your own invite");
      }

      // Get or create acceptor's profile
      let [acceptorProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id));

      if (!acceptorProfile) {
        const [created] = await db
          .insert(userProfiles)
          .values({ id: ctx.user.id, email: ctx.user.email ?? "" })
          .returning();
        acceptorProfile = created!;
      }

      // Add inviter to acceptor's collaborators
      const acceptorSettings = (acceptorProfile.settings ?? {}) as Record<string, unknown>;
      const acceptorCollaborators = (acceptorSettings.collaborators ?? []) as string[];
      if (!acceptorCollaborators.includes(inviterProfile.id)) {
        acceptorCollaborators.push(inviterProfile.id);
      }

      await db
        .update(userProfiles)
        .set({
          settings: {
            ...acceptorSettings,
            collaborators: acceptorCollaborators,
          } as typeof acceptorProfile.settings,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, ctx.user.id));

      // Add acceptor to inviter's collaborators and remove the used invite
      const inviterSettings = (inviterProfile.settings ?? {}) as Record<string, unknown>;
      const inviterCollaborators = (inviterSettings.collaborators ?? []) as string[];
      if (!inviterCollaborators.includes(ctx.user.id)) {
        inviterCollaborators.push(ctx.user.id);
      }

      const remainingInvites = (
        (inviterSettings.pendingInvites ?? []) as Array<{
          email: string;
          token: string;
          createdAt: string;
        }>
      ).filter((inv) => inv.token !== input.token);

      await db
        .update(userProfiles)
        .set({
          settings: {
            ...inviterSettings,
            collaborators: inviterCollaborators,
            pendingInvites: remainingInvites,
          } as typeof inviterProfile.settings,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, inviterProfile.id));

      return { success: true, inviterUserId: inviterProfile.id };
    }),

  // ── Get Collaborators ──────────────────────────────────────────────────────
  getCollaborators: protectedProcedure
    .query(async ({ ctx }) => {
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.user.id));

      if (!profile) return [];

      const settings = (profile.settings ?? {}) as Record<string, unknown>;
      return (settings.collaborators ?? []) as string[];
    }),

  // ── Get Shared Brain ───────────────────────────────────────────────────────
  getSharedBrain: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify that the target user has the current user in their collaborators
      const [targetProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, input.userId));

      if (!targetProfile) throw new Error("User not found");

      const targetSettings = (targetProfile.settings ?? {}) as Record<string, unknown>;
      const targetCollaborators = (targetSettings.collaborators ?? []) as string[];

      if (!targetCollaborators.includes(ctx.user.id)) {
        throw new Error("Access denied: you are not in this user's collaborators list");
      }

      // Fetch target user's active notes
      const sharedNotes = await db
        .select()
        .from(notes)
        .where(and(eq(notes.userId, input.userId), eq(notes.status, "active")))
        .orderBy(desc(notes.createdAt))
        .limit(50);

      return { notes: sharedNotes };
    }),

  // ── Get Shared Note (public) ────────────────────────────────────────────────
  getSharedNote: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      // Search all user profiles for the token in shareLinks
      const profiles = await db.select().from(userProfiles);

      for (const profile of profiles) {
        const settings = (profile.settings ?? {}) as Record<string, unknown>;
        const shareLinks = (settings.shareLinks ?? {}) as Record<string, string>;

        if (shareLinks[input.token]) {
          const noteId = shareLinks[input.token];
          const [note] = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.status, "active")));

          if (note) {
            return note;
          }
        }
      }

      return null;
    }),
});
