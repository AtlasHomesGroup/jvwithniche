import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

declare global {
  var __jvwn_pool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!globalThis.__jvwn_pool) {
    globalThis.__jvwn_pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalThis.__jvwn_pool;
}

export const db = drizzle(getPool(), { schema, casing: "snake_case" });

export { schema };
