import { createPublicClient, createWalletClient, defineChain, http, type Account, type Chain, type PublicClient, type Transport, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createDb, type Db } from "../db/client.ts";
import { chainConfigFromEnv, type ChainConfig } from "../chain/config.ts";
import { loadCorpus } from "../corpus/loader.ts";
import type { AttackCase } from "../corpus/schema.ts";
import { dcapFromEnv, type DcapVerifier } from "../attest/dcap.ts";
import { SupabaseStorage, type BlobStore } from "./storage.ts";

/** Sends one message to a Telegram chat. Tests replace it. */
export type Notify = (chatId: number | string, text: string) => Promise<void>;

/** Everything a route or worker needs. Built once per function instance. */
export interface AppDeps {
  db: Db;
  chain: ChainConfig;
  viemChain: Chain;
  publicClient: PublicClient<Transport, Chain>;
  poster?: WalletClient<Transport, Chain, Account>; // gas only; holds nothing else
  storage: BlobStore;
  corpus: { root: `0x${string}`; cases: AttackCase[] };
  dcap: DcapVerifier;
  cronSecret?: string;
  telegram?: { token: string; webhookSecret?: string; opsChatId?: string };
  notify: Notify;
  allowHttpEndpoints: boolean;
  /** Testnet only: serve the naive / hardened / flaky mock agents at /api/mock-agents/<name>. */
  mockAgents?: boolean;
  now(): number; // ms
}

export function viemChainOf(c: ChainConfig): Chain {
  return defineChain({
    id: c.chainId,
    name: c.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [c.rpcUrl] } },
    blockExplorers: { default: { name: "Explorer", url: c.explorer } },
  });
}

export function telegramNotify(token?: string): Notify {
  return async (chatId, text) => {
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  };
}

/**
 * DATABASE_URL, or POSTGRES_URL as set by the Supabase <-> Vercel integration (transaction pooler). Query
 * flags meant for other drivers (pgbouncer, supa) are dropped; postgres.js would send them to the server.
 */
export function databaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  const raw = env.DATABASE_URL ?? env.POSTGRES_URL;
  if (!raw) return undefined;
  const u = new URL(raw);
  for (const k of ["pgbouncer", "supa", "connection_limit"]) u.searchParams.delete(k);
  return u.toString();
}

export function createDepsFromEnv(env: NodeJS.ProcessEnv = process.env): AppDeps {
  const chain = chainConfigFromEnv(env);
  const viemChain = viemChainOf(chain);
  const transport = http(chain.rpcUrl);
  const corpus = loadCorpus();
  const poster = env.POSTER_PRIVATE_KEY
    ? createWalletClient({ chain: viemChain, transport, account: privateKeyToAccount(env.POSTER_PRIVATE_KEY as `0x${string}`) })
    : undefined;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return {
    db: createDb(databaseUrl(env)).db,
    chain,
    viemChain,
    publicClient: createPublicClient({ chain: viemChain, transport }) as PublicClient<Transport, Chain>,
    poster,
    storage: new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    corpus: { root: corpus.root, cases: corpus.cases.map((c) => c.case) },
    dcap: dcapFromEnv(chain.chainId, env.DCAP_VERIFIER),
    cronSecret: env.CRON_SECRET,
    telegram: env.TELEGRAM_BOT_TOKEN
      ? { token: env.TELEGRAM_BOT_TOKEN, webhookSecret: env.TELEGRAM_WEBHOOK_SECRET, opsChatId: env.TELEGRAM_OPS_CHAT_ID }
      : undefined,
    notify: telegramNotify(env.TELEGRAM_BOT_TOKEN),
    allowHttpEndpoints: env.ALLOW_HTTP_ENDPOINTS === "1",
    mockAgents: env.ENABLE_MOCK_AGENTS === "1" && chain.chainId === 46630,
    now: () => Date.now(),
  };
}
