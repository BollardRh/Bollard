import { and, eq, isNull, sql } from "drizzle-orm";
import { encodePacked, getAddress, keccak256, type Address, type Hex } from "viem";
import { ratingRegistryAbi } from "../chain/abis.ts";
import { cosignatures, runBundles, runRequests } from "../db/schema.ts";
import { seedKeyOf } from "../harness/rng.ts";
import { createNodeHelpers } from "../api/node.ts";
import type { AppDeps } from "../api/context.ts";
import { sendTx } from "./tx.ts";

/**
 * Coordinator (doc §5.7, §8): assigns a lead and co-signers from different attesters, reassigns stalled
 * runs, and posts postRating once a quorum of distinct attesters has signed the same report.
 */

export const STALL_MS = 2 * 3600_000;
/** A bundle that has not reached quorum this long after upload is treated as a stall (co-signers refused or vanished). */
export const BUNDLE_STALL_MS = 6 * 3600_000;

export { trustedAttesters } from "../chain/config.ts";
import { trustedAttesters } from "../chain/config.ts";
export const NODE_FRESH = "10 minutes";

async function quorum(deps: AppDeps): Promise<number> {
  const p = (await deps.publicClient.readContract({ address: deps.chain.contracts.ratingRegistry, abi: ratingRegistryAbi, functionName: "params" })) as readonly unknown[];
  return Number(p[0]);
}

interface Candidate {
  key: string;
  attester: string;
  bond: bigint;
}

/**
 * Stake-weighted pick, deterministic per (request, round): the same inputs give the same assignment, and each
 * reassignment round draws again. `seed` (the hash of the block after the request) makes the pick unknowable
 * when the request is made. Keys in `notLead` can co-sign but are never picked as lead.
 */
export function pickStakeWeighted(cands: Candidate[], requestId: string, n: number, round = 0, seed: Hex = `0x${"00".repeat(32)}`, notLead: string[] = []): Candidate[] {
  const pool = [...cands].sort((a, b) => a.attester.localeCompare(b.attester));
  const out: Candidate[] = [];
  for (let i = 0; out.length < n && pool.length; i++) {
    const eligible = out.length === 0 ? pool.filter((c) => !notLead.includes(c.key)) : pool;
    if (!eligible.length) break;
    const total = eligible.reduce((s, c) => s + (c.bond > 0n ? c.bond : 1n), 0n);
    let r = BigInt(keccak256(encodePacked(["bytes32", "uint256", "uint256", "uint256"], [seed, BigInt(requestId), BigInt(round), BigInt(i)]))) % total;
    const chosen = eligible.find((c) => {
      const w = c.bond > 0n ? c.bond : 1n;
      if (r < w) return true;
      r -= w;
      return false;
    })!;
    out.push(pool.splice(pool.indexOf(chosen), 1)[0]!);
  }
  return out;
}

async function candidates(deps: AppDeps): Promise<Candidate[]> {
  const rows = await deps.db.execute<{ key: string; attester: string; bond: string }>(sql`
    select distinct on (k.attester) k.key, k.attester, a.bond::text
    from enclave_keys k
    join attesters a on a.chain_id = k.chain_id and a.address = k.attester
    join node_registrations n on n.key = k.key
    where k.chain_id = ${deps.chain.chainId} and not k.revoked and k.challenger is null and k.active_at <= now()
      and k.watcher_verdict = 'pass' and not a.jailed
      and n.last_seen > now() - ${NODE_FRESH}::interval
    order by k.attester, n.last_seen desc`);
  const { isActiveKey } = createNodeHelpers(deps);
  const trusted = trustedAttesters();
  const out: Candidate[] = [];
  for (const r of rows) {
    if (trusted && !trusted.has(r.attester.toLowerCase())) continue;
    if (await isActiveKey(getAddress(r.key))) out.push({ key: r.key, attester: r.attester, bond: BigInt(r.bond) });
  }
  return out;
}

export async function runCoordinator(deps: AppDeps) {
  const q = await quorum(deps);
  const assigned: string[] = [];
  const reassigned: string[] = [];
  const posted: { requestId: string; tx?: Hex; skipped?: string }[] = [];

  // ------------------------------------------------------------ 1. assign open requests with an endpoint
  const open = await deps.db
    .select()
    .from(runRequests)
    .where(and(eq(runRequests.chainId, deps.chain.chainId), eq(runRequests.status, "open"), isNull(runRequests.assignedLead)));
  const ready = open.filter((r) => r.endpoint && r.runToken);
  if (ready.length) {
    const cands = await candidates(deps);
    for (const req of ready) {
      if (cands.length < q) break; // not enough distinct attesters online
      const next = await deps.publicClient.getBlock({ blockNumber: req.requestBlock + 1n }).catch(() => null);
      if (!next) continue; // the block that fixes the seeds is not mined yet
      // lead + quorum co-signers (one spare); leads that already stalled on this request are not picked again
      const picked = pickStakeWeighted(cands, req.requestId, Math.min(cands.length, q + 1), req.assignRound, next.hash!, req.stalledLeads ?? []);
      if (picked.length < q) continue;
      const corpusRoot = deps.corpus.root;
      await deps.db
        .update(runRequests)
        .set({
          status: "running",
          assignedLead: picked[0]!.key,
          assignedCosigners: picked.slice(1).map((c) => c.key),
          seedKey: seedKeyOf(BigInt(req.requestId), corpusRoot, next.hash!),
          updatedAt: new Date(deps.now()),
        })
        .where(and(eq(runRequests.chainId, req.chainId), eq(runRequests.requestId, req.requestId), eq(runRequests.status, "open")));
      assigned.push(req.requestId);
    }
  }

  // ------------------------------------------------------------ 2. reassign stalled runs
  // A lead stalled if it uploaded nothing in STALL_MS, or its bundle has not reached quorum in BUNDLE_STALL_MS
  // (co-signers refused it or went away). The lead is remembered so the next round picks someone else.
  const stalled = await deps.db.execute<{ request_id: string }>(sql`
    update run_requests r set status = 'open', assigned_lead = null, assigned_cosigners = null, updated_at = now(),
      assign_round = r.assign_round + 1, stalled_leads = array_append(r.stalled_leads, r.assigned_lead)
    where r.chain_id = ${deps.chain.chainId} and r.status = 'running'
      and (
        (r.updated_at < ${new Date(deps.now() - STALL_MS).toISOString()}::timestamptz
          and not exists (select 1 from run_bundles b where b.chain_id = r.chain_id and b.request_id = r.request_id and b.lead_key = r.assigned_lead))
        or exists (select 1 from run_bundles b where b.chain_id = r.chain_id and b.request_id = r.request_id and b.lead_key = r.assigned_lead
                    and b.posted_tx is null and b.created_at < ${new Date(deps.now() - BUNDLE_STALL_MS).toISOString()}::timestamptz)
      )
    returning r.request_id::text`);
  for (const s of stalled) reassigned.push(s.request_id);
  if (stalled.length && deps.telegram?.opsChatId) {
    await deps.notify(deps.telegram.opsChatId, `Coordinator reassigned stalled runs: ${stalled.map((s) => s.request_id).join(", ")}`);
  }

  // ------------------------------------------------------------ 3. post bundles that reached quorum
  const pending = await deps.db
    .select()
    .from(runBundles)
    .where(and(eq(runBundles.chainId, deps.chain.chainId), isNull(runBundles.postedTx), sql`${runBundles.createdAt} > now() - interval '14 days'`))
    .orderBy(runBundles.createdAt)
    .limit(20);
  const { isActiveKey } = createNodeHelpers(deps);
  for (const b of pending) {
    const sigs = await deps.db.select().from(cosignatures).where(eq(cosignatures.bundleHash, b.bundleHash));
    const byAttester = new Map<string, (typeof sigs)[number]>();
    // one signature per attester, lead first, and only keys that are active right now: postRating reverts
    // the whole call if any submitted key is inactive, so a co-signer that revokes its key cannot block it
    for (const s of [...sigs].sort((x, y) => (x.enclaveKey === b.leadKey ? -1 : y.enclaveKey === b.leadKey ? 1 : 0))) {
      if (s.digest !== b.reportDigest || byAttester.has(s.attester)) continue;
      if (await isActiveKey(getAddress(s.enclaveKey))) byAttester.set(s.attester, s);
    }
    if (byAttester.size < q) continue;

    const req = (await deps.publicClient.readContract({
      address: deps.chain.contracts.ratingRegistry,
      abi: ratingRegistryAbi,
      functionName: "requests",
      args: [BigInt(b.requestId)],
    })) as readonly unknown[];
    const onchainStatus = Number(req[5]);
    if (onchainStatus !== 1) {
      const why = onchainStatus === 2 ? "already-rated" : onchainStatus === 3 ? "refunded" : "unknown-request";
      await deps.db.update(runBundles).set({ postedTx: `skipped:${why}`, postedAt: new Date(deps.now()) }).where(eq(runBundles.bundleHash, b.bundleHash));
      posted.push({ requestId: b.requestId, skipped: why });
      continue;
    }

    const r = b.report as Record<string, string | number>;
    const report = {
      agentRegistry: getAddress(String(r.agentRegistry)) as Address,
      agentId: BigInt(r.agentId!),
      versionHash: r.versionHash as Hex,
      requestId: BigInt(r.requestId!),
      corpusRoot: r.corpusRoot as Hex,
      holdoutCommit: r.holdoutCommit as Hex,
      runsRoot: r.runsRoot as Hex,
      seeds: Number(r.seeds),
      score: Number(r.score),
      grade: Number(r.grade),
      testedMask: Number(r.testedMask),
      failedMask: Number(r.failedMask),
      issuedAt: BigInt(r.issuedAt!),
      expiresAt: BigInt(r.expiresAt!),
    };
    const chosen = [...byAttester.values()].slice(0, q);
    const res = await sendTx(deps, {
      address: deps.chain.contracts.ratingRegistry,
      abi: ratingRegistryAbi,
      functionName: "postRating",
      args: [report, chosen.map((s) => getAddress(s.enclaveKey)), chosen.map((s) => s.signature as Hex)],
    });
    if (res.ok) {
      await deps.db.update(runBundles).set({ postedTx: res.hash, postedAt: new Date(deps.now()) }).where(eq(runBundles.bundleHash, b.bundleHash));
      posted.push({ requestId: b.requestId, tx: res.hash });
    } else {
      posted.push({ requestId: b.requestId, skipped: res.reason });
      if (deps.telegram?.opsChatId) await deps.notify(deps.telegram.opsChatId, `postRating for request ${b.requestId} failed: ${res.reason}`);
    }
  }

  return { quorum: q, assigned, reassigned, posted };
}
