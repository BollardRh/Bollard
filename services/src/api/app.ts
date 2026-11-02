import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { webhookCallback } from "grammy";
import type { AppDeps } from "./context.ts";
import { appRouter } from "./router.ts";
import { rateLimit } from "./rateLimit.ts";
import { checkOnChain, latestRating, searchAgents } from "./ratings.ts";
import { config, recentRatings, stats } from "./reads.ts";
import { nodeRoutes } from "./node.ts";
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
  app.get("/api/v1/config", async (c) => c.json(await config(deps)));
  app.get("/api/v1/stats", async (c) => c.json(await stats(deps)));
  app.get("/api/v1/recent", async (c) => c.json(await recentRatings(deps)));

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
    return c.json(await searchAgents(deps, q));
  });

  // ---------------------------------------------------------------- tRPC (doc §8)
  app.use("/api/trpc/*", rateLimit(deps));
  app.all("/api/trpc/*", (c) =>
    fetchRequestHandler({ endpoint: "/api/trpc", req: c.req.raw, router: appRouter, createContext: () => ({ deps }) }),
  );

  // ---------------------------------------------------------------- harness nodes
  app.route("/", nodeRoutes(deps));

  // ---------------------------------------------------------------- testnet demo agents (BATP/1 over HTTPS)
  if (deps.mockAgents) app.route("/api/mock-agents", mockAgentApp());

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
  app.post("/api/cron/:job", async (c) => {
    const secret = c.req.header("x-cron-secret") ?? "";
    const fromVault = secret ? await vaultCronSecret() : undefined;
    const ok = (deps.cronSecret && safeEqual(secret, deps.cronSecret)) || (fromVault && safeEqual(secret, fromVault));
    if (!secret || !ok) return c.json({ error: "forbidden" }, 403);
    const job = CRON_JOBS[c.req.param("job")];
    if (!job) return c.json({ error: "unknown job" }, 404);
    const started = deps.now();
    const result = await job(deps);
    return c.body(JSON.stringify({ ok: true, ms: deps.now() - started, result }, (_, v) => (typeof v === "bigint" ? v.toString() : v)), 200, {
      "content-type": "application/json",
    });
  });

  // ---------------------------------------------------------------- Telegram
  if (deps.telegram) {
    const bot = createBot(deps, deps.telegram.token);
    const handle = webhookCallback(bot, "hono", { secretToken: deps.telegram.webhookSecret });
    app.post("/api/telegram", (c) => handle(c));
  }

  return app;
}
