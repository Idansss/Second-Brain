import { createDb } from "@repo/db";
import { serverEnv } from "./env";

// Single DB instance per server process.
//
// Note: during some build environments, DATABASE_URL may be absent even
// though it exists at runtime. We avoid crashing at import time and instead
// throw a clear error only if DB access is attempted.
export const db = serverEnv.DATABASE_URL
  ? createDb(serverEnv.DATABASE_URL)
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL is missing. Set it in Vercel/CI environment variables (and include ?sslmode=require for Supabase pooler)."
          );
        },
      }
    );

