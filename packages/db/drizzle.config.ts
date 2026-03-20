import type { Config } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load env from the web app
config({ path: resolve(__dirname, "../../apps/web/.env.local") });

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
