import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must start with postgres:// or postgresql://",
    })
    .refine((v) => v.includes("sslmode=require"), {
      message: "DATABASE_URL must include ?sslmode=require",
    }),
});

function formatEnvErrorMessage(message: string, databaseUrl?: string) {
  const hints: string[] = [];

  if (databaseUrl?.includes("@db.") && databaseUrl.includes(".supabase.co:5432")) {
    hints.push(
      "It looks like you're using the direct DB hostname (db.<ref>.supabase.co:5432). This repo expects the Supabase Transaction Pooler connection string (host like aws-0-<region>.pooler.supabase.com with port 6543)."
    );
  } else {
    hints.push(
      "Get the correct value from Supabase → Settings → Database → Connection string → Transaction mode."
    );
  }

  hints.push(
    'Example: DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require"'
  );

  return [
    "Invalid server environment configuration.",
    message,
    "",
    ...hints.map((h) => `- ${h}`),
  ].join("\n");
}

const parsed = serverEnvSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
});

// During some CI/build environments (e.g. Vercel build), env vars may not be
// forwarded to the build step. We should not hard-crash during module import;
// instead, fail only when the DB is actually used.
let serverEnvValue: { DATABASE_URL: string };
if (!parsed.success) {
  if (!process.env.DATABASE_URL) {
    serverEnvValue = { DATABASE_URL: "" };
  } else {
    const first = parsed.error.issues[0];
    throw new Error(
      formatEnvErrorMessage(
        `${first?.path?.join(".") || "env"}: ${first?.message || "Invalid value"}`,
        process.env.DATABASE_URL
      )
    );
  }
} else {
  serverEnvValue = parsed.data;
}

export const serverEnv = serverEnvValue;

