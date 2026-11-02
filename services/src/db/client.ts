import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema.ts";

/**
 * Database client for the API and workers on Vercel. Use the Supabase pooler in transaction mode
 * (port 6543); it does not support prepared statements, hence `prepare: false`. One small pool per
 * function instance.
 */
export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
  return { db: drizzle(client, { schema }), client };
}

export type Db = ReturnType<typeof createDb>["db"];

/** Spends `cost` tokens from `key`'s bucket. Default: 1,000 per day (doc §8). */
export async function takeToken(db: Db, key: string, cost = 1, capacity = 1000, refillPerSec = 1000 / 86_400) {
  const rows = await db.execute<{ ok: boolean }>(sql`select take_token(${key}, ${cost}, ${capacity}, ${refillPerSec}) as ok`);
  return Boolean(rows[0]?.ok);
}

/** True the first time a (key, nonce) pair is seen; false on replay. */
export async function useNodeNonce(db: Db, key: string, nonce: string) {
  const rows = await db.execute<{ ok: boolean }>(sql`select use_node_nonce(${key}, ${nonce}) as ok`);
  return Boolean(rows[0]?.ok);
}

export { schema };
