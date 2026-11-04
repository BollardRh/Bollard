import { and, asc, desc, eq, sql } from "drizzle-orm";
import { decodeEventLog, getAddress, type Abi, type Address, type Log } from "viem";
import {
  agents,
  apiKeys,
  arenaAttempts,
  arenaMessages,
  arenaSessions,
  arenas,
  attackCases,
  attesters,
  chainEvents,
  corpusCandidates,
  corpusVersions,
  cursors,
  enclaveKeys,
  nodeRegistrations,
  ratings,
  runRequests,
} from "../db/schema.ts";
import {
  arenaBountyAbi,
  attesterRegistryAbi,
  feeRouterAbi,
  identityRegistryAbi,
  ratingRegistryAbi,
  safeRatingGuardAbi,
} from "../chain/abis.ts";
import { leafOf } from "../corpus/merkle.ts";
import type { AppDeps } from "../api/context.ts";

/**
 * Indexer (doc §8): getLogs per contract up to head minus confirmations, raw events into chain_events and
 * read models updated in the same transaction as the cursor, so a crash never half-applies a range.
 */

type Tx = Parameters<Parameters<AppDeps["db"]["transaction"]>[0]>[0];
type Decoded = { log: Log; name: string; args: Record<string, unknown> };

const MAX_RANGE = 2_000n;
/** How far to step back when the block a cursor ended on is no longer on the canonical chain. */
export const REORG_REWIND = 500n;
const lc = (a: unknown) => String(a).toLowerCase();
const s = (v: unknown) => (typeof v === "bigint" ? v.toString() : String(v));
const at = (secs: bigint | number) => new Date(Number(secs) * 1000);
const jsonArgs = (a: Record<string, unknown>) => JSON.parse(JSON.stringify(a, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

export function streamsOf(deps: AppDeps): { stream: string; address: Address; abi: Abi }[] {
  const c = deps.chain.contracts;
  const out = [
    { stream: "rating_registry", address: c.ratingRegistry, abi: ratingRegistryAbi as Abi },
    { stream: "attester_registry", address: c.attesterRegistry, abi: attesterRegistryAbi as Abi },
    { stream: "fee_router", address: c.feeRouter, abi: feeRouterAbi as Abi },
  ];
  if (c.arenaBounty) out.push({ stream: "arena_bounty", address: c.arenaBounty, abi: arenaBountyAbi as Abi });
  if (c.safeRatingGuard) out.push({ stream: "safe_rating_guard", address: c.safeRatingGuard, abi: safeRatingGuardAbi as Abi });
  return out;
}

export async function runIndexer(deps: AppDeps) {
  const head = await deps.publicClient.getBlockNumber({ cacheTime: 0 }); // never a cached head
  const safe = head - BigInt(deps.chain.confirmations);
  const summary: { stream: string; from: string; to: string; logs: number }[] = [];
  const errors: { stream: string; error: string }[] = [];
  const reorgs: { stream: string; block: string; rewoundTo: string }[] = [];
  const hashes = new Map<bigint, string>();
  const hashAt = async (n: bigint) => {
    if (!hashes.has(n)) hashes.set(n, lc((await deps.publicClient.getBlock({ blockNumber: n })).hash));
    return hashes.get(n)!;
  };

  // each stream on its own: one failing stream must not hold the others back
  for (const st of streamsOf(deps)) {
    try {
      const r = await indexStream(deps, st, safe, hashAt);
      if (r.reorg) reorgs.push({ stream: st.stream, ...r.reorg });
      if (r.range) summary.push({ stream: st.stream, ...r.range });
    } catch (e) {
      errors.push({ stream: st.stream, error: (e as Error).message.slice(0, 300) });
    }
  }
  if ((errors.length || reorgs.length) && deps.telegram?.opsChatId) {
    const lines = [...reorgs.map((r) => `reorg on ${r.stream} at block ${r.block}: rewound to ${r.rewoundTo}; events from orphaned blocks may remain in chain_events, review them`), ...errors.map((e) => `${e.stream}: ${e.error}`)];
    await deps.notify(deps.telegram.opsChatId, `Indexer: ${lines.join("\n")}`);
  }
  return { head: head.toString(), safe: safe.toString(), streams: summary, ...(errors.length ? { errors } : {}), ...(reorgs.length ? { reorgs } : {}) };
}

async function indexStream(
  deps: AppDeps,
  st: { stream: string; address: Address; abi: Abi },
  safe: bigint,
  hashAt: (n: bigint) => Promise<string>,
): Promise<{ range?: { from: string; to: string; logs: number }; reorg?: { block: string; rewoundTo: string } }> {
  {
    const [cur] = await deps.db.select().from(cursors).where(and(eq(cursors.chainId, deps.chain.chainId), eq(cursors.stream, st.stream)));
    let from = cur && cur.block > 0n ? cur.block + 1n : deps.chain.startBlock;
    let reorg: { block: string; rewoundTo: string } | undefined;
    // the block this cursor ended on must still be canonical; otherwise step back and index again
    if (cur?.blockHash && cur.block > 0n && (await hashAt(cur.block)) !== cur.blockHash) {
      const back = cur.block > deps.chain.startBlock + REORG_REWIND ? cur.block - REORG_REWIND : deps.chain.startBlock;
      reorg = { block: cur.block.toString(), rewoundTo: back.toString() };
      from = back;
    }
    if (from > safe) return { reorg };
    const to = safe < from + MAX_RANGE - 1n ? safe : from + MAX_RANGE - 1n;

    const logs = await deps.publicClient.getLogs({ address: st.address, fromBlock: from, toBlock: to });
    const decoded: Decoded[] = [];
    for (const log of logs) {
      try {
        const d = decodeEventLog({ abi: st.abi, data: log.data, topics: log.topics, strict: false });
        decoded.push({ log, name: String(d.eventName), args: (d.args ?? {}) as Record<string, unknown> });
      } catch {
        /* not one of ours */
      }
    }
    const pre = await prefetch(deps, decoded);
    const toHash = await hashAt(to);

    await deps.db.transaction(async (tx) => {
      for (const d of decoded) {
        await tx
          .insert(chainEvents)
          .values({
            chainId: deps.chain.chainId,
            blockNumber: d.log.blockNumber!,
            logIndex: d.log.logIndex!,
            txHash: d.log.transactionHash!,
            address: lc(d.log.address),
            name: d.name,
            args: jsonArgs(d.args),
          })
          .onConflictDoNothing();
        await project(deps, tx, d, pre);
      }
      await tx
        .insert(cursors)
        .values({ chainId: deps.chain.chainId, stream: st.stream, block: to, blockHash: toHash })
        .onConflictDoUpdate({ target: [cursors.chainId, cursors.stream], set: { block: to, blockHash: toHash } });
    });
    return { range: { from: from.toString(), to: to.toString(), logs: decoded.length }, reorg };
  }
}

// ------------------------------------------------------------------ chain reads done outside the transaction
interface Prefetched {
  blockTime: Map<bigint, Date>;
  rating: Map<string, readonly unknown[]>;
  attester: Map<string, readonly [bigint, bigint, bigint, boolean]>;
  agent: Map<string, { owner: string | null; wallet: string | null }>;
  tiebreakWindow: bigint;
}

async function prefetch(deps: AppDeps, ds: Decoded[]): Promise<Prefetched> {
  const p: Prefetched = { blockTime: new Map(), rating: new Map(), attester: new Map(), agent: new Map(), tiebreakWindow: 0n };
  const read = (address: Address, abi: Abi, functionName: string, args: unknown[]) =>
    deps.publicClient.readContract({ address, abi, functionName, args } as never) as Promise<unknown>;
  for (const d of ds) {
    const bn = d.log.blockNumber!;
    if (!p.blockTime.has(bn)) p.blockTime.set(bn, at((await deps.publicClient.getBlock({ blockNumber: bn })).timestamp));
    if (d.name === "RatingPosted") {
      const id = s(d.args.ratingId);
      p.rating.set(id, (await read(deps.chain.contracts.ratingRegistry, ratingRegistryAbi as Abi, "getRating", [BigInt(id)])) as readonly unknown[]);
    }
    if (["Bonded", "UnbondRequested", "Withdrawn", "Slashed"].includes(d.name)) {
      const a = lc(d.args.attester);
      p.attester.set(a, (await read(deps.chain.contracts.attesterRegistry, attesterRegistryAbi as Abi, "attesters", [getAddress(a)])) as never);
    }
    if (d.name === "RunRequested") {
      const reg = getAddress(String(d.args.agentRegistry));
      const id = BigInt(s(d.args.agentId));
      const owner = await read(reg, identityRegistryAbi as Abi, "ownerOf", [id]).catch(() => null);
      const wallet = await read(reg, identityRegistryAbi as Abi, "getAgentWallet", [id]).catch(() => null);
      p.agent.set(`${lc(reg)}:${id}`, { owner: owner ? lc(owner) : null, wallet: wallet ? lc(wallet) : null });
    }
    if (d.name === "RatingDisputed" && p.tiebreakWindow === 0n) {
      const params = (await read(deps.chain.contracts.ratingRegistry, ratingRegistryAbi as Abi, "params", [])) as readonly unknown[];
      p.tiebreakWindow = params[8] as bigint;
    }
  }
  return p;
}

// ------------------------------------------------------------------ read models
async function project(deps: AppDeps, tx: Tx, d: Decoded, p: Prefetched) {
  const chainId = deps.chain.chainId;
  const a = d.args;
  const time = p.blockTime.get(d.log.blockNumber!)!;
  const ratingWhere = (id: unknown) => and(eq(ratings.chainId, chainId), eq(ratings.ratingId, s(id)));

  switch (d.name) {
    // ---------------------------------------------------------- RatingRegistry
    case "RunRequested": {
      await tx
        .insert(runRequests)
        .values({
          chainId,
          requestId: s(a.requestId),
          agentRegistry: lc(a.agentRegistry),
          agentId: s(a.agentId),
          versionHash: lc(a.versionHash),
          payer: lc(a.payer),
          fee: s(a.fee),
          status: "open",
          requestBlock: d.log.blockNumber!,
          createdAt: time,
        })
        .onConflictDoNothing();
      const ag = p.agent.get(`${lc(a.agentRegistry)}:${s(a.agentId)}`);
      const row = { chainId, agentRegistry: lc(a.agentRegistry), agentId: s(a.agentId), owner: ag?.owner ?? null, agentWallet: ag?.wallet ?? null, currentVersion: lc(a.versionHash), updatedAt: time };
      await tx
        .insert(agents)
        .values(row)
        .onConflictDoUpdate({ target: [agents.chainId, agents.agentRegistry, agents.agentId], set: { owner: row.owner, agentWallet: row.agentWallet, currentVersion: row.currentVersion, updatedAt: time } });
      break;
    }
    case "VersionDeclared":
      await tx
        .insert(agents)
        .values({ chainId, agentRegistry: lc(a.agentRegistry), agentId: s(a.agentId), currentVersion: lc(a.versionHash), updatedAt: time })
        .onConflictDoUpdate({ target: [agents.chainId, agents.agentRegistry, agents.agentId], set: { currentVersion: lc(a.versionHash), updatedAt: time } });
      break;
    case "RequestRefunded":
      await tx.update(runRequests).set({ status: "refunded", updatedAt: time }).where(and(eq(runRequests.chainId, chainId), eq(runRequests.requestId, s(a.requestId))));
      break;
    case "RatingPosted": {
      const g = p.rating.get(s(a.ratingId))!;
      const r = g[0] as Record<string, bigint | number | string>;
      const status = ({ 1: "active", 2: "disputed", 3: "void" } as const)[Number(g[1]) as 1 | 2 | 3] ?? "active";
      await tx
        .insert(ratings)
        .values({
          chainId,
          ratingId: s(a.ratingId),
          requestId: s(a.requestId),
          agentRegistry: lc(a.agentRegistry),
          agentId: s(a.agentId),
          versionHash: lc(a.versionHash),
          score: Number(r.score),
          grade: Number(r.grade),
          testedMask: Number(r.testedMask),
          failedMask: Number(r.failedMask),
          issuedAt: at(r.issuedAt as bigint),
          expiresAt: at(r.expiresAt as bigint),
          digest: lc(a.digest),
          attesters: (a.attesters as string[]).map(lc),
          status,
          disputeDeadline: at(g[3] as bigint),
          txHash: d.log.transactionHash!,
          blockNumber: d.log.blockNumber!,
        })
        .onConflictDoNothing();
      await tx.update(runRequests).set({ status: "rated", updatedAt: time }).where(and(eq(runRequests.chainId, chainId), eq(runRequests.requestId, s(a.requestId))));
      break;
    }
    case "RatingDisputed":
      await tx
        .update(ratings)
        .set({ status: "disputed", disputeDeadline: new Date(time.getTime() + Number(p.tiebreakWindow) * 1000) })
        .where(ratingWhere(a.ratingId));
      break;
    case "DisputeResolved":
      await tx
        .update(ratings)
        .set(a.originalUpheld ? { status: "active", disputeDeadline: time } : { status: "void", feesReleased: true })
        .where(ratingWhere(a.ratingId));
      break;
    case "DisputeExpired":
      await tx.update(ratings).set({ status: "void", feesReleased: true }).where(ratingWhere(a.ratingId));
      break;
    case "FeesReleased":
      await tx.update(ratings).set({ feesReleased: true }).where(ratingWhere(a.ratingId));
      break;
    case "CorpusPublished": {
      const root = lc(a.root);
      const local = root === lc(deps.corpus.root);
      await tx
        .insert(corpusVersions)
        .values({ root, holdoutCommit: lc(a.holdoutCommit), uri: String(a.uri), caseCount: local ? deps.corpus.cases.length : 0, publishedAt: time, retired: false })
        .onConflictDoUpdate({ target: corpusVersions.root, set: { holdoutCommit: lc(a.holdoutCommit), uri: String(a.uri), publishedAt: time, retired: false } });
      if (local) {
        for (const c of deps.corpus.cases) {
          await tx.insert(attackCases).values({ id: c.id, corpusRoot: root, family: c.family, body: c, leaf: leafOf(c) }).onConflictDoNothing();
        }
      }
      break;
    }
    case "CorpusRetired":
      await tx.update(corpusVersions).set({ retired: true }).where(eq(corpusVersions.root, lc(a.root)));
      break;

    // ---------------------------------------------------------- AttesterRegistry
    case "Bonded":
    case "UnbondRequested":
    case "Withdrawn":
    case "Slashed": {
      const st = p.attester.get(lc(a.attester))!;
      const row = { chainId, address: lc(a.attester), bond: s(st[0]), unbonding: s(st[1]), withdrawableAt: st[2] > 0n ? at(st[2]) : null, jailed: st[3] };
      await tx.insert(attesters).values(row).onConflictDoUpdate({ target: [attesters.chainId, attesters.address], set: row });
      break;
    }
    case "EnclaveKeyRegistered": {
      const [reg] = await tx.select({ eventLog: nodeRegistrations.eventLog }).from(nodeRegistrations).where(eq(nodeRegistrations.key, lc(a.key)));
      await tx
        .insert(enclaveKeys)
        .values({
          chainId,
          key: lc(a.key),
          attester: lc(a.attester),
          osMeasurement: lc(a.osMeasurement),
          composeHash: lc(a.composeHash),
          rtmr3Hash: lc(a.rtmr3Hash),
          quoteHash: lc(a.quoteHash),
          rawQuote: Buffer.from(String(a.rawQuote).slice(2), "hex"),
          eventLog: reg?.eventLog ?? null,
          activeAt: at(a.activeAt as bigint),
          watcherVerdict: "pending",
        })
        .onConflictDoNothing();
      break;
    }
    case "EnclaveKeyRevoked":
      await tx.update(enclaveKeys).set({ revoked: true }).where(and(eq(enclaveKeys.chainId, chainId), eq(enclaveKeys.key, lc(a.key))));
      break;
    case "KeyChallenged":
      await tx.update(enclaveKeys).set({ challenger: lc(a.challenger) }).where(and(eq(enclaveKeys.chainId, chainId), eq(enclaveKeys.key, lc(a.key))));
      break;
    case "KeyChallengeResolved":
      await tx
        .update(enclaveKeys)
        .set({ challenger: null, ...(a.fraud ? { revoked: true, watcherVerdict: "fail" as const } : {}) })
        .where(and(eq(enclaveKeys.chainId, chainId), eq(enclaveKeys.key, lc(a.key))));
      break;

    // ---------------------------------------------------------- FeeRouter
    case "PlanPaid": {
      const keyHash = lc(a.apiKeyHash).replace(/^0x/, "");
      const months = Number(a.months);
      await tx
        .insert(apiKeys)
        .values({ keyHash, plan: "paid", paidUntil: new Date(time.getTime() + months * 30 * 86_400_000) })
        .onConflictDoUpdate({
          target: apiKeys.keyHash,
          // postgres.js cannot bind a Date inside a raw sql fragment: pass ISO text and cast
          set: { plan: "paid", paidUntil: sql`greatest(coalesce(${apiKeys.paidUntil}, now()), ${time.toISOString()}::timestamptz) + make_interval(days => ${months * 30})` },
        });
      break;
    }

    // ---------------------------------------------------------- ArenaBounty
    case "ArenaOpened":
      await tx
        .insert(arenas)
        .values({
          chainId,
          arenaId: s(a.arenaId),
          funder: lc(a.funder),
          token: lc(a.token),
          bounty: s(a.bounty),
          canary: lc(a.canary),
          agentKey: lc(a.agentKey),
          houseAgentId: s(a.houseAgentId),
          endsAt: at(a.endsAt as bigint),
          status: "open",
        })
        .onConflictDoNothing();
      break;
    case "AttemptOpened":
      await tx
        .insert(arenaAttempts)
        .values({ chainId, arenaId: s(a.arenaId), attacker: lc(a.attacker), openedBlock: d.log.blockNumber!, expiresAt: at(a.expiresAt as bigint), commit: lc(a.transcriptCommit) })
        .onConflictDoNothing();
      break;
    case "ArenaWon": {
      const arenaId = s(a.arenaId);
      const attacker = lc(a.attacker);
      await tx.update(arenas).set({ status: "won", winner: attacker }).where(and(eq(arenas.chainId, chainId), eq(arenas.arenaId, arenaId)));
      // the winning chat becomes a corpus candidate for the curator (doc §7 step 5)
      const [session] = await tx
        .select()
        .from(arenaSessions)
        .where(and(eq(arenaSessions.chainId, chainId), eq(arenaSessions.arenaId, arenaId), eq(arenaSessions.attacker, attacker)))
        .orderBy(desc(arenaSessions.openedBlock))
        .limit(1);
      const messages = session
        ? await tx.select({ role: arenaMessages.role, content: arenaMessages.content, actions: arenaMessages.actions }).from(arenaMessages).where(eq(arenaMessages.sessionId, session.sessionId)).orderBy(asc(arenaMessages.id))
        : [];
      await tx
        .insert(corpusCandidates)
        .values({
          source: "arena",
          arenaId,
          attacker,
          transcript: { chainId, winTx: d.log.transactionHash, attemptCommit: lc(a.transcriptCommit), transcriptHash: session?.transcriptHash ?? null, messages },
        })
        .onConflictDoNothing();
      break;
    }
    case "ArenaReclaimed":
      await tx.update(arenas).set({ status: "reclaimed" }).where(and(eq(arenas.chainId, chainId), eq(arenas.arenaId, s(a.arenaId))));
      break;
  }
}
