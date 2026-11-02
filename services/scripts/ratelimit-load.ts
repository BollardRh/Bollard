/**
 * Load test for the public rate limiter (Phase 10). Runs the real API in-process against a throwaway
 * Postgres database and fires concurrent requests at a rate-limited route.
 *
 *   TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/postgres bun services/scripts/ratelimit-load.ts [total] [concurrency]
 *
 * Checks: one IP gets exactly FREE_PER_DAY requests through, however many run at once; other IPs are not
 * affected; a made-up API key does not open a fresh bucket; latency stays reasonable under contention.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import * as schema from "../src/db/schema.ts";
import { createApp } from "../src/api/app.ts";
import type { AppDeps } from "../src/api/context.ts";
import { MemoryStorage } from "../src/api/storage.ts";
import { DevDcapVerifier } from "../src/attest/dcap.ts";
import { FREE_PER_DAY } from "../src/api/rateLimit.ts";
import { createTestDb } from "../test/helpers/testdb.ts";

const ADMIN = process.env.TEST_DATABASE_URL;
if (!ADMIN) throw new Error("set TEST_DATABASE_URL");
const TOTAL = Number(process.argv[2] ?? 1500);
const CONCURRENCY = Number(process.argv[3] ?? 100);

const db = await createTestDb(ADMIN);
const pg = postgres(db.url, { prepare: false, max: 20, onnotice: () => {} });
const zero = "0x0000000000000000000000000000000000000001" as const;
const deps: AppDeps = {
  db: drizzle(pg, { schema }),
  chain: { chainId: 31337, name: "Local", rpcUrl: "http://127.0.0.1:1", explorer: "", confirmations: 0, startBlock: 0n, contracts: { ratingRegistry: zero, attesterRegistry: zero, feeRouter: zero, feeToken: zero, identity8004: zero } },
  viemChain: foundry,
  publicClient: createPublicClient({ chain: foundry, transport: http("http://127.0.0.1:1") }) as unknown as AppDeps["publicClient"],
  storage: new MemoryStorage(),
  corpus: { root: `0x${"00".repeat(32)}`, cases: [] },
  dcap: new DevDcapVerifier(31337),
  notify: async () => {},
  allowHttpEndpoints: false,
  now: () => Date.now(),
};
const api = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: createApp(deps).fetch });
const base = `http://127.0.0.1:${api.port}`;

async function burst(n: number, concurrency: number, headers: Record<string, string>) {
  const latencies: number[] = [];
  const codes = new Map<number, number>();
  let next = 0;
  const worker = async () => {
    while (next < n) {
      next++;
      const t = performance.now();
      const r = await fetch(`${base}/v1/search?q=291`, { headers });
      await r.arrayBuffer();
      latencies.push(performance.now() - t);
      codes.set(r.status, (codes.get(r.status) ?? 0) + 1);
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const secs = (performance.now() - t0) / 1000;
  latencies.sort((a, b) => a - b);
  const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))]!.toFixed(1);
  return { codes: Object.fromEntries(codes), rps: Math.round(n / secs), p50: p(0.5), p95: p(0.95), p99: p(0.99) };
}

let failed = false;
const expect = (ok: boolean, what: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failed = true;
};

try {
  console.log(`limit ${FREE_PER_DAY}/day per IP; ${TOTAL} requests from one IP at concurrency ${CONCURRENCY}`);
  const one = await burst(TOTAL, CONCURRENCY, { "x-forwarded-for": "198.51.100.1" });
  console.log("  ", one);
  expect(one.codes[200] === Math.min(TOTAL, FREE_PER_DAY), `exactly ${Math.min(TOTAL, FREE_PER_DAY)} allowed`);
  expect((one.codes[429] ?? 0) === Math.max(0, TOTAL - FREE_PER_DAY), `${Math.max(0, TOTAL - FREE_PER_DAY)} refused with 429`);

  const other = await burst(200, 50, { "x-forwarded-for": "198.51.100.2" });
  console.log("   other IP:", other);
  expect(other.codes[200] === 200, "a different IP is unaffected");

  const keyed = await burst(200, 50, { "x-forwarded-for": "198.51.100.1", "x-api-key": "made-up-key" });
  console.log("   same IP with an unregistered API key:", keyed);
  expect((keyed.codes[429] ?? 0) === 200, "an unregistered API key gets no bucket of its own");
} finally {
  api.stop(true);
  await pg.end();
  await db.drop();
}
process.exit(failed ? 1 : 0);
