import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { schema };

// Call this once per server process (connection pooling handled by postgres.js)
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
