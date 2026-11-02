import { and, eq, inArray, lte, lt, sql } from "drizzle-orm";
import { getAddress } from "viem";
import { ratingRegistryAbi, safeRatingGuardAbi } from "../chain/abis.ts";
import { ratings, runRequests, watchedSafes } from "../db/schema.ts";
import type { AppDeps } from "../api/context.ts";
import { sendTx } from "./tx.ts";

/**
 * Keeper (doc §8, §11): permissionless calls anyone could make, made reliably. Every call is simulated
 * first, so one that is no longer needed (already released, window still open) costs nothing.
 */

const BATCH = 25;

export async function keeperFees(deps: AppDeps) {
  const due = await deps.db
    .select({ ratingId: ratings.ratingId })
    .from(ratings)
    .where(and(eq(ratings.chainId, deps.chain.chainId), eq(ratings.status, "active"), eq(ratings.feesReleased, false), lte(ratings.disputeDeadline, new Date(deps.now()))))
    .limit(BATCH);
  const out = [];
  for (const r of due) {
    const res = await sendTx(deps, { address: deps.chain.contracts.ratingRegistry, abi: ratingRegistryAbi, functionName: "releaseFees", args: [BigInt(r.ratingId)] });
    if (!res.ok && res.reason === "AlreadyReleased") {
      await deps.db.update(ratings).set({ feesReleased: true }).where(and(eq(ratings.chainId, deps.chain.chainId), eq(ratings.ratingId, r.ratingId)));
    }
    out.push({ ratingId: r.ratingId, ...res });
  }
  return { released: out };
}

export async function keeperDisputes(deps: AppDeps) {
  const due = await deps.db
    .select({ ratingId: ratings.ratingId })
    .from(ratings)
    .where(and(eq(ratings.chainId, deps.chain.chainId), eq(ratings.status, "disputed"), lte(ratings.disputeDeadline, new Date(deps.now()))))
    .limit(BATCH);
  const out = [];
  for (const r of due) {
    out.push({ ratingId: r.ratingId, ...(await sendTx(deps, { address: deps.chain.contracts.ratingRegistry, abi: ratingRegistryAbi, functionName: "expireDispute", args: [BigInt(r.ratingId)] })) });
  }
  return { expired: out };
}

export async function keeperRefunds(deps: AppDeps) {
  const p = (await deps.publicClient.readContract({ address: deps.chain.contracts.ratingRegistry, abi: ratingRegistryAbi, functionName: "params" })) as readonly unknown[];
  const ttlMs = Number(p[9] as bigint) * 1000;
  const due = await deps.db
    .select({ requestId: runRequests.requestId })
    .from(runRequests)
    .where(and(eq(runRequests.chainId, deps.chain.chainId), inArray(runRequests.status, ["open", "running"]), lt(runRequests.createdAt, new Date(deps.now() - ttlMs))))
    .limit(BATCH);
  const out = [];
  for (const r of due) {
    out.push({ requestId: r.requestId, ...(await sendTx(deps, { address: deps.chain.contracts.ratingRegistry, abi: ratingRegistryAbi, functionName: "refundExpiredRequest", args: [BigInt(r.requestId)] })) });
  }
  return { refunded: out };
}

export async function keeperRevokes(deps: AppDeps) {
  const guard = deps.chain.contracts.safeRatingGuard;
  if (!guard) return { revoked: [], note: "GUARD_RHC not configured" };
  const watched = await deps.db.select().from(watchedSafes).where(eq(watchedSafes.chainId, deps.chain.chainId)).limit(200);
  const out = [];
  for (const w of watched) {
    const res = await sendTx(deps, { address: guard, abi: safeRatingGuardAbi, functionName: "revokeIfFailing", args: [getAddress(w.safe), getAddress(w.delegate)] });
    if (res.ok) {
      out.push({ safe: w.safe, delegate: w.delegate, tx: res.hash });
      await deps.db.execute(sql`delete from watched_safes where chain_id = ${w.chainId} and safe = ${w.safe} and delegate = ${w.delegate}`);
    }
  }
  return { checked: watched.length, revoked: out };
}
