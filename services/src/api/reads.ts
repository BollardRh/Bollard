import { and, desc, eq, sql } from "drizzle-orm";
import { arenas, attesters, corpusVersions, enclaveKeys, nodeRegistrations } from "../db/schema.ts";
import { FAMILY_PREFIX, FAMILY_TITLES, isCritical } from "../corpus/families.ts";
import type { AppDeps } from "./context.ts";
import { runFee } from "./builder.ts";
import { lc } from "./ratings.ts";

/** Small read models for the dashboard: config, stats, corpus, nodes, arenas. */

export async function config(deps: AppDeps) {
  let fee: string | null = null;
  try {
    fee = (await runFee(deps)).toString();
  } catch {
    /* RPC down: the dashboard still renders */
  }
  return {
    chainId: deps.chain.chainId,
    network: deps.chain.name,
    testnet: deps.chain.chainId === 46630,
    explorer: deps.chain.explorer,
    contracts: deps.chain.contracts,
    runFee: fee,
    feeDecimals: 6,
    families: families(deps),
    corpusRoot: deps.corpus.root,
  };
}

export function families(deps: AppDeps) {
  return FAMILY_TITLES.map((title, index) => ({
    index,
    key: FAMILY_PREFIX[index],
    title,
    critical: isCritical(index),
    cases: deps.corpus.cases.filter((c) => c.family === index).length,
  }));
}

export async function stats(deps: AppDeps) {
  const [row] = await deps.db.execute<{
    active_ratings: number;
    agents: number;
    attesters: number;
    active_keys: number;
    runs_open: number;
  }>(sql`
    select
      (select count(*)::int from ratings where chain_id = ${deps.chain.chainId} and status = 'active' and expires_at > now()) as active_ratings,
      (select count(*)::int from agents where chain_id = ${deps.chain.chainId}) as agents,
      (select count(*)::int from attesters where chain_id = ${deps.chain.chainId} and not jailed and bond > 0) as attesters,
      (select count(*)::int from enclave_keys where chain_id = ${deps.chain.chainId} and not revoked and active_at <= now()) as active_keys,
      (select count(*)::int from run_requests where chain_id = ${deps.chain.chainId} and status in ('open', 'running')) as runs_open`);
  const [corpus] = await deps.db.select().from(corpusVersions).orderBy(desc(corpusVersions.publishedAt)).limit(1);
  return {
    chainId: deps.chain.chainId,
    activeRatings: row?.active_ratings ?? 0,
    agents: row?.agents ?? 0,
    attesters: row?.attesters ?? 0,
    activeKeys: row?.active_keys ?? 0,
    runsOpen: row?.runs_open ?? 0,
    corpus: corpus ? { root: corpus.root, caseCount: corpus.caseCount, publishedAt: corpus.publishedAt?.toISOString() ?? null } : null,
  };
}

export async function corpusVersionList(deps: AppDeps) {
  const rows = await deps.db.select().from(corpusVersions).orderBy(desc(corpusVersions.publishedAt));
  return rows.map((r) => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null }));
}

export async function nodeList(deps: AppDeps) {
  const att = await deps.db.select().from(attesters).where(eq(attesters.chainId, deps.chain.chainId));
  const keys = await deps.db.select().from(enclaveKeys).where(eq(enclaveKeys.chainId, deps.chain.chainId));
  const regs = await deps.db.select({ key: nodeRegistrations.key, lastSeen: nodeRegistrations.lastSeen }).from(nodeRegistrations);
  const seen = new Map(regs.map((r) => [r.key, r.lastSeen.toISOString()]));
  return att.map((a) => ({
    address: a.address,
    bond: a.bond,
    unbonding: a.unbonding,
    jailed: a.jailed,
    withdrawableAt: a.withdrawableAt?.toISOString() ?? null,
    keys: keys
      .filter((k) => k.attester === a.address)
      .map((k) => ({
        key: k.key,
        osMeasurement: k.osMeasurement,
        composeHash: k.composeHash,
        activeAt: k.activeAt.toISOString(),
        revoked: k.revoked,
        challenged: Boolean(k.challenger),
        watcherVerdict: k.watcherVerdict,
        lastSeen: seen.get(k.key) ?? null,
      })),
  }));
}

export async function nodeKey(deps: AppDeps, key: string) {
  const [k] = await deps.db.select().from(enclaveKeys).where(and(eq(enclaveKeys.chainId, deps.chain.chainId), eq(enclaveKeys.key, lc(key))));
  if (!k) return null;
  const { rawQuote, ...rest } = k;
  return { ...rest, rawQuote: `0x${Buffer.from(rawQuote).toString("hex")}`, activeAt: k.activeAt.toISOString() };
}

export async function arenaList(deps: AppDeps) {
  const rows = await deps.db.select().from(arenas).where(eq(arenas.chainId, deps.chain.chainId)).orderBy(desc(arenas.endsAt)).limit(50);
  return rows.map((a) => ({ ...a, endsAt: a.endsAt.toISOString() }));
}
