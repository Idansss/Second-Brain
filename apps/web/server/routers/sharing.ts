import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { notes, userProfiles } from "@repo/db";
import { eq, and, desc } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

import { db } from "../db";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function sendInviteEmail(toEmail: string, inviterEmail: string, inviteLink: string, token: string) {
  const admin = getAdminClient();
  if (!admin) return false;

  // Use Supabase admin to send a custom email via the auth flow
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">You're invited to Second Brain</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin-bottom:24px">
        <strong>${inviterEmail}</strong> has invited you to connect on Second Brain — an AI-powered knowledge management app.
      </p>
      <a href="${inviteLink}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
        Accept Invite
      </a>
      <p style="color:#9ca3af;font-size:13px;margin-top:16px">
        Or paste this token manually on the Shared Brain page:<br/>
        <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:13px">${token}</code>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px">Second Brain · Your AI knowledge layer</p>
    </div>
  `;

  // Use Supabase's auth admin to send email via their email system
  const { error } = await admin.auth.admin.inviteUserByEmail(toEmail, {
    redirectTo: inviteLink,
    data: { invite_token: token, inviter: inviterEmail, custom_email_html: html },
  });
  return !error;
}

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

      // Send email directly to invitee
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", ".vercel.app") ?? "http://localhost:3000";
      const inviteLink = `${appUrl}/shared-brain?accept=${token}`;
      const emailSent = await sendInviteEmail(input.email, ctx.user.email ?? "someone", inviteLink, token);

      return { token, emailSent, inviteLink };
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
