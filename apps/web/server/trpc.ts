import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createServerClient } from "@/lib/supabase/server";

export async function createContext() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires authenticated user
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
