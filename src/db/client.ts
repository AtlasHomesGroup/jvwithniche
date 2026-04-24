import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

declare global {
  var __jvwn_pool: Pool | undefined;
  var __jvwn_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
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

function getDb() {
  if (!globalThis.__jvwn_db) {
    globalThis.__jvwn_db = drizzle(getPool(), { schema, casing: "snake_case" });
  }
  return globalThis.__jvwn_db;
}

/**
 * Lazy Proxy around the Drizzle client. Deferring the actual Pool +
 * drizzle() construction until first access keeps `import { db }` safe
 * during `next build`'s page-data collection phase (which runs before
 * runtime env vars like DATABASE_URL are available in e.g. GitHub Actions
 * CI).
 */
export const db = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop, receiver) {
      const client = getDb() as unknown as Record<string | symbol, unknown>;
      const value = client[prop];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return Reflect.get(client as object, prop, receiver);
    },
  },
);

export { schema };
