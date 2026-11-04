import { timingSafeEqual } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { webhookCallback } from "grammy/web"; // web build: native fetch; the node build's node-fetch breaks once bundled
import type { AppDeps } from "./context.ts";
import { appRouter } from "./router.ts";
import { rateLimit, trpcCalls } from "./rateLimit.ts";
import { checkOnChain, latestRating, searchAgents } from "./ratings.ts";
import { config, recentRatings, stats } from "./reads.ts";
import { jsonBig, nodeRoutes } from "./node.ts";
import { corpusCandidates } from "../db/schema.ts";
import { createBot } from "./bot.ts";
import { mockAgentApp } from "../mock-agents/server.ts";
import { runIndexer } from "../workers/indexer.ts";
import { runCoordinator } from "../workers/coordinator.ts";
import { keeperDisputes, keeperFees, keeperRefunds, keeperRevokes } from "../workers/keeper.ts";
import { runWatcher } from "../workers/watcher.ts";
import { runAlerts } from "../workers/alerts.ts";

/**
 * The Bollard API (doc §8) as one Hono app: Vercel serves it as a single function, `bun src/api/server.ts`
 * serves it locally.
 *
 *   GET  /api/health, /api/v1/config, /api/v1/stats
 *   GET  /v1/rating/:chainId/:agentId, /v1/check/:chainId/:agentId, /v1/search      (rate-limited, public)
 *   ANY  /api/trpc/*                                                                (rate-limited)
 *   POST /api/node/{hello,claim,bundle,cosign}                                      (enclave-signed)
 *   POST /api/cron/:job                                                             (x-cron-secret)
 *   POST /api/telegram                                                              (Telegram secret token)
 */

/** Lease for a cron job's lock; longer than the function's maxDuration, released early when the run ends. */
const JOB_LEASE_S = 150;

export const CRON_JOBS: Record<string, (deps: AppDeps) => Promise<unknown>> = {
  indexer: runIndexer,
  coordinator: runCoordinator,
  "watch-keys": runWatcher,
  "keeper-fees": keeperFees,
  "keeper-disputes": keeperDisputes,
  "keeper-refunds": keeperRefunds,
  "keeper-revokes": keeperRevokes,
  alerts: runAlerts,
};

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createApp(deps: AppDeps) {
  const app = new Hono();

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  // public, read-only, cacheable by anyone
  app.use("/v1/*", cors({ origin: "*", allowMethods: ["GET"] }));
  app.use("/api/v1/*", cors({ origin: "*", allowMethods: ["GET"] }));

  app.get("/api/health", (c) => c.json({ ok: true, chainId: deps.chain.chainId }));
  // dashboard reads: cached briefly at Vercel's CDN, so traffic spikes do not reach the database
  const cdn = (seconds: number) => ({ "cache-control": `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}` });
  app.get("/api/v1/config", async (c) => c.json(await config(deps), 200, cdn(60)));
  app.get("/api/v1/stats", async (c) => c.json(await stats(deps), 200, cdn(15)));
  app.get("/api/v1/recent", async (c) => c.json(await recentRatings(deps), 200, cdn(15)));

  // ---------------------------------------------------------------- REST (doc §8)
  app.use("/v1/*", rateLimit(deps));
  const ref = (chainId: string, agentId: string, registry?: string) => ({
    chainId: Number(chainId),
    agentRegistry: registry ?? deps.chain.contracts.identity8004,
    agentId,
  });
  const badRef = (chainId: string, agentId: string, registry?: string) =>
    Number(chainId) !== deps.chain.chainId || !/^\d{1,78}$/.test(agentId) || (registry !== undefined && !/^0x[0-9a-fA-F]{40}$/.test(registry));

  app.get("/v1/rating/:chainId/:agentId", async (c) => {
    const { chainId, agentId } = c.req.param();
    const registry = c.req.query("registry");
    if (badRef(chainId, agentId, registry)) return c.json({ error: "unknown chain or bad agent reference" }, 404);
    const v = await latestRating(deps, ref(chainId, agentId, registry));
    return v ? c.json(v) : c.json({ error: "no rating" }, 404);
  });

  app.get("/v1/check/:chainId/:agentId", async (c) => {
    const { chainId, agentId } = c.req.param();
    const registry = c.req.query("registry");
    const min = Number(c.req.query("min") ?? 1);
    const mask = Number(c.req.query("mask") ?? 0);
    if (badRef(chainId, agentId, registry) || !(min >= 1 && min <= 5) || !(mask >= 0 && mask <= 255)) {
      return c.json({ error: "bad parameters" }, 400);
    }
    return c.json(await checkOnChain(deps, ref(chainId, agentId, registry), min, mask));
  });

  app.get("/v1/search", async (c) => {
    const q = c.req.query("q") ?? "";
    if (q.trim().length < 2 && !/^\d+$/.test(q.trim())) return c.json({ error: "q must be an agent id or at least 2 characters" }, 400);
    if (q.length > 100) return c.json({ error: "q is limited to 100 characters" }, 400);
    return c.json(await searchAgents(deps, q));
  });

  // ---------------------------------------------------------------- tRPC (doc §8)
  // a batched call ("a,b,c?batch=1") is charged one token per procedure, at most 10 per request
  app.use("/api/trpc/*", rateLimit(deps, { cost: trpcCalls }));
  app.all("/api/trpc/*", (c) =>
    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext: () => ({ deps }),
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") console.error(`trpc ${path}:`, error.cause ?? error);
      },
    }),
  );

  // ---------------------------------------------------------------- harness nodes
  // nodes poll every 30 s; the bucket is per IP and generous enough for several nodes behind one address
  app.use("/api/node/*", bodyLimit({ maxSize: 4 * 1024 * 1024, onError: (c) => c.json({ error: "body too large" }, 413) }));
  app.use("/api/node/*", rateLimit(deps, { bucket: "node", perDay: 20_000 }));
  app.route("/", nodeRoutes(deps));

  // ---------------------------------------------------------------- testnet demo agents (BATP/1 over HTTPS)
  if (deps.mockAgents) {
    app.use("/api/mock-agents/*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.json({ error: "body too large" }, 413) }));
    app.use("/api/mock-agents/*", rateLimit(deps, { bucket: "mock", perDay: 20_000 }));
    app.route("/api/mock-agents", mockAgentApp());
  }

  // ---------------------------------------------------------------- scheduled jobs (pg_cron -> pg_net)
  // Accepts CRON_SECRET (manual calls) or the Vault secret `cron_secret` that pg_cron sends. The Vault value is
  // generated inside Supabase and read here over the API's own database connection, so it is never copied.
  let vaultSecret: { value?: string; until: number } = { until: 0 };
  const vaultCronSecret = async () => {
    if (vaultSecret.until > deps.now()) return vaultSecret.value;
    try {
      const rows = await deps.db.execute<{ s: string }>(sql`select decrypted_secret as s from vault.decrypted_secrets where name = 'cron_secret' limit 1`);
      vaultSecret = { value: rows[0]?.s, until: deps.now() + 300_000 };
    } catch {
      vaultSecret = { value: undefined, until: deps.now() + 60_000 }; // no Vault (plain Postgres in tests)
    }
    return vaultSecret.value;
  };
  const opsAuthorized = async (secret: string) => {
    if (!secret) return false;
    const fromVault = await vaultCronSecret();
    return Boolean((deps.cronSecret && safeEqual(secret, deps.cronSecret)) || (fromVault && safeEqual(secret, fromVault)));
  };
  app.post("/api/cron/:job", async (c) => {
    if (!(await opsAuthorized(c.req.header("x-cron-secret") ?? ""))) return c.json({ error: "forbidden" }, 403);
    const name = c.req.param("job");
    if (!Object.hasOwn(CRON_JOBS, name)) return c.json({ error: "unknown job" }, 404);
    const job = CRON_JOBS[name]!;
    // one run per job at a time: a slow tick must not overlap the next one
    const locked = await deps.db.execute<{ ok: boolean }>(sql`select take_job_lock(${name}, ${JOB_LEASE_S}) as ok`);
    if (!locked[0]?.ok) return c.json({ ok: true, skipped: "previous run still active" });
    const started = deps.now();
    let result: unknown;
    try {
      result = await job(deps);
    } finally {
      await deps.db.execute(sql`update job_locks set locked_until = clock_timestamp() where job = ${name}`);
    }
    return c.body(JSON.stringify({ ok: true, ms: deps.now() - started, result }, (_, v) => (typeof v === "bigint" ? v.toString() : v)), 200, {
      "content-type": "application/json",
    });
  });

  // ---------------------------------------------------------------- corpus curation (ops only, same secret as cron)
  // Arena wins arrive as corpus_candidates. A curator reads them here and marks each one public, holdout or
  // rejected; turning one into a case is a corpus edit plus publishCorpus through the timelock.
  app.use("/api/admin/*", async (c, next) => {
    if (!(await opsAuthorized(c.req.header("x-cron-secret") ?? ""))) return c.json({ error: "forbidden" }, 403);
    await next();
  });
  app.get("/api/admin/candidates", async (c) => {
    const status = c.req.query("status");
    const rows = await deps.db
      .select()
      .from(corpusCandidates)
      .where(status ? eq(corpusCandidates.status, status as "pending") : undefined)
      .orderBy(desc(corpusCandidates.id))
      .limit(100);
    return c.body(jsonBig(rows.map(({ transcript, ...r }) => ({ ...r, messages: ((transcript as { messages?: unknown[] })?.messages ?? []).length }))), 200, {
      "content-type": "application/json",
    });
  });
  app.get("/api/admin/candidates/:id", async (c) => {
    if (!/^\d{1,18}$/.test(c.req.param("id"))) return c.json({ error: "bad id" }, 400);
    const [row] = await deps.db.select().from(corpusCandidates).where(eq(corpusCandidates.id, BigInt(c.req.param("id"))));
    return row ? c.body(jsonBig(row), 200, { "content-type": "application/json" }) : c.json({ error: "not found" }, 404);
  });
  app.post("/api/admin/candidates/:id", async (c) => {
    if (!/^\d{1,18}$/.test(c.req.param("id"))) return c.json({ error: "bad id" }, 400);
    const body = (await c.req.json().catch(() => ({}))) as { status?: string; family?: number };
    if (!["pending", "public", "holdout", "rejected"].includes(String(body.status))) return c.json({ error: "status must be pending, public, holdout or rejected" }, 400);
    if (body.family !== undefined && !(Number.isInteger(body.family) && body.family >= 0 && body.family <= 7)) return c.json({ error: "family must be 0-7" }, 400);
    const [row] = await deps.db
      .update(corpusCandidates)
      .set({ status: body.status as "pending", ...(body.family !== undefined ? { familyGuess: body.family } : {}) })
      .where(eq(corpusCandidates.id, BigInt(c.req.param("id"))))
      .returning({ id: corpusCandidates.id, status: corpusCandidates.status, familyGuess: corpusCandidates.familyGuess });
    return row ? c.body(jsonBig(row), 200, { "content-type": "application/json" }) : c.json({ error: "not found" }, 404);
  });

  // ---------------------------------------------------------------- Telegram
  // without a secret token anyone could post forged updates, so the webhook is not served at all
  if (deps.telegram?.webhookSecret) {
    const bot = createBot(deps, deps.telegram.token);
    const handle = webhookCallback(bot, "hono", { secretToken: deps.telegram.webhookSecret });
    app.post("/api/telegram", (c) => handle(c));
  }

  return app;
}
