import { createDb } from "@repo/db";
import { serverEnv } from "./env";

// Single DB instance per server process.
export const db = createDb(serverEnv.DATABASE_URL);

