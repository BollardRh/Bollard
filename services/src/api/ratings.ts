import { trustedAttesters } from "../chain/config.ts";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getAddress, isAddress, type Address } from "viem";
import { agents, ratings, runBundles } from "../db/schema.ts";
import { FAMILY_TITLES, isCritical } from "../corpus/families.ts";
import { ratingRegistryAbi } from "../chain/abis.ts";
import { CHECK_CODES } from "../chain/config.ts";
import type { AppDeps } from "./context.ts";

/** Rating reads shared by REST, tRPC and the Telegram bot. Addresses are stored lowercase. */

export interface AgentRef {
  chainId: number;
  agentRegistry: string;
  agentId: string;
}

export const lc = (a: string) => a.toLowerCase();

export function familiesView(tested: number, failed: number) {
  return FAMILY_TITLES.map((title, index) => ({
    index,
    title,
    critical: isCritical(index),
    tested: ((tested >> index) & 1) === 1,
    failed: ((failed >> index) & 1) === 1,
  }));
}

type RatingRow = typeof ratings.$inferSelect;

export function ratingView(
  r: RatingRow,
  currentVersion: string | null,
  bundle: { bundleHash: string; publicUri: string } | null,
  nowMs: number,
) {
  const expired = r.expiresAt.getTime() <= nowMs;
  const stale = currentVersion !== null && currentVersion.toLowerCase() !== r.versionHash.toLowerCase();
  const usable = r.status === "active" && !expired && !stale;
  return {
    chainId: r.chainId,
    ratingId: r.ratingId,
    requestId: r.requestId,
    agentRegistry: r.agentRegistry,
    agentId: r.agentId,
    versionHash: r.versionHash,
    currentVersion,
    score: r.score,
    grade: r.grade,
    testedMask: r.testedMask,
    failedMask: r.failedMask,
    families: familiesView(r.testedMask, r.failedMask),
    issuedAt: r.issuedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt.toISOString(),
    status: r.status,
    expired,
    stale,
    usable,
    disputeDeadline: r.disputeDeadline?.toISOString() ?? null,
    attesters: r.attesters,
    // null when no allowlist is configured; false when any signer is outside it
    signersTrusted: (() => {
      const t = trustedAttesters();
      return t ? r.attesters.every((a) => t.has(a.toLowerCase())) : null;
    })(),
    txHash: r.txHash,
    blockNumber: r.blockNumber.toString(),
    bundle: bundle ? { hash: bundle.bundleHash, url: bundle.publicUri } : null,
  };
}

export type RatingView = ReturnType<typeof ratingView>;

async function attach(deps: AppDeps, r: RatingRow): Promise<RatingView> {
  const [agent] = await deps.db
    .select({ currentVersion: agents.currentVersion })
    .from(agents)
    .where(and(eq(agents.chainId, r.chainId), eq(agents.agentRegistry, r.agentRegistry), eq(agents.agentId, r.agentId)));
  const [bundle] = await deps.db
    .select({ bundleHash: runBundles.bundleHash, publicUri: runBundles.publicUri })
    .from(runBundles)
    .where(and(eq(runBundles.chainId, r.chainId), eq(runBundles.requestId, r.requestId), isNotNull(runBundles.postedTx)))
    .limit(1);
  return ratingView(r, agent?.currentVersion ?? null, bundle ?? null, deps.now());
}

export async function latestRating(deps: AppDeps, ref: AgentRef): Promise<RatingView | null> {
  const [r] = await deps.db
    .select()
    .from(ratings)
    .where(and(eq(ratings.chainId, ref.chainId), eq(ratings.agentRegistry, lc(ref.agentRegistry)), eq(ratings.agentId, ref.agentId)))
    .orderBy(desc(ratings.ratingId))
    .limit(1);
  return r ? attach(deps, r) : null;
}

export async function ratingById(deps: AppDeps, chainId: number, ratingId: string): Promise<RatingView | null> {
  const [r] = await deps.db.select().from(ratings).where(and(eq(ratings.chainId, chainId), eq(ratings.ratingId, ratingId)));
  return r ? attach(deps, r) : null;
}

export async function ratingHistory(deps: AppDeps, ref: AgentRef): Promise<RatingView[]> {
  const rows = await deps.db
    .select()
    .from(ratings)
    .where(and(eq(ratings.chainId, ref.chainId), eq(ratings.agentRegistry, lc(ref.agentRegistry)), eq(ratings.agentId, ref.agentId)))
    .orderBy(desc(ratings.ratingId))
    .limit(50);
  return Promise.all(rows.map((r) => attach(deps, r)));
}

/** Search by agent name (trigram), owner / wallet / registry address, or numeric ERC-8004 id. */
export async function searchAgents(deps: AppDeps, q: string) {
  const query = q.trim();
  const where = isAddress(query)
    ? sql`(a.owner = ${lc(query)} or a.agent_wallet = ${lc(query)} or a.agent_registry = ${lc(query)})`
    : /^\d+$/.test(query)
      ? sql`a.agent_id = ${query}`
      : sql`(a.name operator(extensions.%) ${query} or a.name ilike ${`%${query.replace(/[\\%_]/g, "\\$&")}%`})`;
  const order = isAddress(query) || /^\d+$/.test(query) ? sql`a.agent_id` : sql`extensions.similarity(a.name, ${query}) desc`;
  const rows = await deps.db.execute<{
    chain_id: number;
    agent_registry: string;
    agent_id: string;
    name: string | null;
    owner: string | null;
    grade: number | null;
    status: string | null;
    expires_at: string | null;
  }>(sql`
    select a.chain_id, a.agent_registry, a.agent_id::text, a.name, a.owner, r.grade, r.status, r.expires_at
    from agents a
    left join lateral (
      select grade, status, expires_at from ratings
      where chain_id = a.chain_id and agent_registry = a.agent_registry and agent_id = a.agent_id
      order by rating_id desc limit 1
    ) r on true
    where a.chain_id = ${deps.chain.chainId} and ${where}
    order by ${order}
    limit 20`);
  return [...rows].map((r) => ({
    chainId: r.chain_id,
    agentRegistry: r.agent_registry,
    agentId: r.agent_id,
    name: r.name,
    owner: r.owner,
    latestGrade: r.grade,
    latestStatus: r.status,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  }));
}

/** Mirrors the on-chain gate: RatingRegistry.check(agentRegistry, agentId, minGrade, requiredPassMask). */
export async function checkOnChain(deps: AppDeps, ref: AgentRef, minGrade: number, mask: number) {
  const [ok, code, validUntil] = (await deps.publicClient.readContract({
    address: deps.chain.contracts.ratingRegistry,
    abi: ratingRegistryAbi,
    functionName: "check",
    args: [getAddress(ref.agentRegistry) as Address, BigInt(ref.agentId), minGrade, mask],
  })) as readonly [boolean, number, bigint];
  return { ok, code, codeName: CHECK_CODES[code] ?? "UNKNOWN", validUntil: validUntil.toString(), minGrade, mask };
}
