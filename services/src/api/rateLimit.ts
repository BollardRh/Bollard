import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
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

const keyCache = new Map<string, { plan: "free" | "paid" | null; until: number }>();

/** null when the key is not registered; unknown keys get no bucket of their own. */
async function planOf(deps: AppDeps, keyHash: string): Promise<"free" | "paid" | null> {
  const hit = keyCache.get(keyHash);
  if (hit && hit.until > deps.now()) return hit.plan;
  const [row] = await deps.db.select({ paidUntil: apiKeys.paidUntil }).from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
  const plan = !row ? null : row.paidUntil && row.paidUntil.getTime() > deps.now() ? "paid" : "free";
  if (keyCache.size > 10_000) keyCache.clear();
  // unknown keys are re-checked soon, so a key works shortly after its plan payment is indexed
  keyCache.set(keyHash, { plan, until: deps.now() + (plan ? 60_000 : 10_000) });
  return plan;
}

/** How many tRPC procedures one HTTP request runs (batched calls are "a,b,c?batch=1"). */
export function trpcCalls(path: string): number {
  const procs = path.replace(/^.*\/api\/trpc\//, "");
  return procs ? procs.split(",").length : 1;
}
export const MAX_BATCH = 10;

/**
 * Charges `cost(c)` tokens (default 1) per request. An x-api-key counts only when it is registered in
 * api_keys; otherwise the request is charged to the client IP (Vercel overwrites x-forwarded-for).
 */
export function rateLimit(deps: AppDeps, opts: { perDay?: number; bucket?: string; cost?: (path: string) => number } = {}): MiddlewareHandler {
  return async (c, next) => {
    const cost = opts.cost ? opts.cost(new URL(c.req.url).pathname) : 1;
    if (cost > MAX_BATCH) return c.json({ error: `at most ${MAX_BATCH} calls per batch` }, 400);
    const apiKey = c.req.header("x-api-key");
    const ipBucket = `${opts.bucket ?? "ip"}:${clientIp((n) => c.req.header(n))}`;
    let bucket = ipBucket;
    let perDay = opts.perDay ?? FREE_PER_DAY;
    if (apiKey && !opts.bucket) {
      const h = hashApiKey(apiKey);
      const plan = await planOf(deps, h);
      if (plan) {
        bucket = `key:${h}`;
        if (plan === "paid") perDay = PAID_PER_DAY;
      }
    }
    const ok = await takeToken(deps.db, bucket, cost, perDay, perDay / 86_400);
    c.header("x-ratelimit-limit", String(perDay));
    if (!ok) return c.json({ error: "rate limit exceeded", limitPerDay: perDay, upgrade: "FeeRouter.payPlan" }, 429);
    await next();
  };
}
