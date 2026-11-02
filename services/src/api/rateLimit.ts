import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { apiKeys } from "../db/schema.ts";
import { takeToken } from "../db/client.ts";
import type { AppDeps } from "./context.ts";

/**
 * Public read limits (doc §8): 1,000 requests per day per IP, or per API key on the free plan. Keys on a
 * paid plan (activated by the indexer from FeeRouter.PlanPaid) get a much larger bucket. Postgres token
 * bucket, so it holds across all Vercel instances.
 */
export const FREE_PER_DAY = 1000;
export const PAID_PER_DAY = 100_000;

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export function clientIp(h: (name: string) => string | undefined): string {
  return h("x-forwarded-for")?.split(",")[0]?.trim() || h("x-real-ip") || "unknown";
}

const paidCache = new Map<string, { paid: boolean; until: number }>();

async function isPaid(deps: AppDeps, keyHash: string): Promise<boolean> {
  const hit = paidCache.get(keyHash);
  if (hit && hit.until > deps.now()) return hit.paid;
  const [row] = await deps.db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), gt(apiKeys.paidUntil, new Date(deps.now()))));
  const paid = Boolean(row);
  paidCache.set(keyHash, { paid, until: deps.now() + 60_000 });
  return paid;
}

export function rateLimit(deps: AppDeps): MiddlewareHandler {
  return async (c, next) => {
    const apiKey = c.req.header("x-api-key");
    let bucket: string;
    let perDay = FREE_PER_DAY;
    if (apiKey) {
      const h = hashApiKey(apiKey);
      bucket = `key:${h}`;
      if (await isPaid(deps, h)) perDay = PAID_PER_DAY;
    } else {
      bucket = `ip:${clientIp((n) => c.req.header(n))}`;
    }
    const ok = await takeToken(deps.db, bucket, 1, perDay, perDay / 86_400);
    c.header("x-ratelimit-limit", String(perDay));
    if (!ok) return c.json({ error: "rate limit exceeded", limitPerDay: perDay, upgrade: "FeeRouter.payPlan" }, 429);
    await next();
  };
}
