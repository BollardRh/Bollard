import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  keccak256,
  recoverMessageAddress,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { erc20Abi, identityRegistryAbi, ratingRegistryAbi } from "../chain/abis.ts";
import { runBundles, runRequests } from "../db/schema.ts";
import { FAMILY_TITLES, isCritical } from "../corpus/families.ts";
import type { SignedBundle } from "../attest/cosign.ts";
import type { AppDeps } from "./context.ts";
import { lc, ratingById, type AgentRef } from "./ratings.ts";

/** Builder side (doc §7 /builders, §8 builder router). */

/** versionHash = keccak256(abi.encode(imageDigest, configHash, keccak256(bytes(modelId)))) (doc §3.3). */
export function versionHash(imageDigest: Hex, configHash: Hex, modelId: string): Hex {
  return keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }], [imageDigest, configHash, keccak256(toHex(modelId))]),
  );
}

let runFeeCache: { fee: bigint; until: number } | undefined;
export async function runFee(deps: AppDeps): Promise<bigint> {
  if (runFeeCache && runFeeCache.until > deps.now()) return runFeeCache.fee;
  const p = (await deps.publicClient.readContract({
    address: deps.chain.contracts.ratingRegistry,
    abi: ratingRegistryAbi,
    functionName: "params",
  })) as readonly unknown[];
  const fee = p[10] as bigint; // Params.runFee
  runFeeCache = { fee, until: deps.now() + 300_000 };
  return fee;
}

/** The two transactions the owner signs: approve the fee token, then requestRun. */
export async function requestCalldata(deps: AppDeps, ref: AgentRef, version: Hex, validationRequestHash?: Hex) {
  const fee = await runFee(deps);
  const registry = deps.chain.contracts.ratingRegistry;
  return {
    chainId: deps.chain.chainId,
    fee: fee.toString(),
    feeToken: deps.chain.contracts.feeToken,
    approve: { to: deps.chain.contracts.feeToken, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [registry, fee] }) },
    requestRun: {
      to: registry,
      data: encodeFunctionData({
        abi: ratingRegistryAbi,
        functionName: "requestRun",
        args: [getAddress(ref.agentRegistry), BigInt(ref.agentId), version, validationRequestHash ?? `0x${"00".repeat(32)}`],
      }),
    },
  };
}

export const endpointMessage = (chainId: number, requestId: string, endpoint: string) =>
  `Bollard: set the BATP endpoint for request ${requestId} on chain ${chainId} to ${endpoint}`;

/**
 * The payer names the endpoint the harness will test, by signing endpointMessage. Returns the per-run bearer
 * token the endpoint should accept (doc §5.1).
 */
export async function setEndpoint(deps: AppDeps, i: { chainId: number; requestId: string; endpoint: string; signature: Hex }) {
  const u = (() => {
    try {
      return new URL(i.endpoint);
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "endpoint is not a URL" });
    }
  })();
  if (u.protocol !== "https:" && !(deps.allowHttpEndpoints && u.protocol === "http:")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "endpoint must be https" });
  }
  const [req] = await deps.db
    .select()
    .from(runRequests)
    .where(and(eq(runRequests.chainId, i.chainId), eq(runRequests.requestId, i.requestId)));
  if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "request not indexed yet; try again in a minute" });
  if (req.status === "rated" || req.status === "refunded") throw new TRPCError({ code: "CONFLICT", message: `request is ${req.status}` });
  const signer = await recoverMessageAddress({ message: endpointMessage(i.chainId, i.requestId, i.endpoint), signature: i.signature });
  if (lc(signer) !== lc(req.payer)) throw new TRPCError({ code: "FORBIDDEN", message: "signature is not from the payer" });
  const token = req.runToken ?? randomBytes(32).toString("hex");
  await deps.db
    .update(runRequests)
    .set({ endpoint: u.toString().replace(/\/$/, ""), runToken: token, updatedAt: new Date(deps.now()) })
    .where(and(eq(runRequests.chainId, i.chainId), eq(runRequests.requestId, i.requestId)));
  return { ok: true as const, runToken: token };
}

export async function runStatus(deps: AppDeps, chainId: number, requestId: string) {
  const [req] = await deps.db.select().from(runRequests).where(and(eq(runRequests.chainId, chainId), eq(runRequests.requestId, requestId)));
  if (!req) return null;
  const [bundle] = await deps.db
    .select()
    .from(runBundles)
    .where(and(eq(runBundles.chainId, chainId), eq(runBundles.requestId, requestId)))
    .limit(1);
  return {
    chainId,
    requestId,
    status: req.status,
    agentRegistry: req.agentRegistry,
    agentId: req.agentId,
    versionHash: req.versionHash,
    endpointSet: Boolean(req.endpoint),
    assignedLead: req.assignedLead,
    cosigners: req.assignedCosigners?.length ?? 0,
    createdAt: req.createdAt.toISOString(),
    bundle: bundle
      ? { hash: bundle.bundleHash, url: bundle.publicUri, score: bundle.score, grade: bundle.grade, postedTx: bundle.postedTx }
      : null,
  };
}

export const fixListMessage = (chainId: number, ratingId: string) => `Bollard: show the fix list for rating ${ratingId} on chain ${chainId}`;

/** Owner-only detail: which public cases lost and how, plus holdout loss counts per family. */
export async function fixList(deps: AppDeps, i: { chainId: number; ratingId: string; signature: Hex }) {
  const rating = await ratingById(deps, i.chainId, i.ratingId);
  if (!rating) throw new TRPCError({ code: "NOT_FOUND", message: "rating not found" });
  const signer = await recoverMessageAddress({ message: fixListMessage(i.chainId, i.ratingId), signature: i.signature });
  const allowed = (await deps.publicClient.readContract({
    address: getAddress(rating.agentRegistry) as Address,
    abi: identityRegistryAbi,
    functionName: "isAuthorizedOrOwner",
    args: [signer, BigInt(rating.agentId)],
  })) as boolean;
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "only the agent owner or an operator can read the fix list" });
  if (!rating.bundle) throw new TRPCError({ code: "NOT_FOUND", message: "run bundle not available" });

  const raw = await deps.storage.get("bundles", `${rating.bundle.hash}.json`);
  if (!raw) throw new TRPCError({ code: "NOT_FOUND", message: "run bundle not available" });
  const { bundle } = JSON.parse(raw) as SignedBundle;
  const cases = new Map(deps.corpus.cases.map((c) => [c.id, c]));

  const byCase = new Map<string, { seeds: number; failedSeeds: number; losses: Set<string> }>();
  for (const s of bundle.sessions) {
    const e = byCase.get(s.receipt.caseId) ?? { seeds: 0, failedSeeds: 0, losses: new Set<string>() };
    e.seeds++;
    if (s.receipt.outcome === "loss") e.failedSeeds++;
    s.receipt.losses.forEach((l) => e.losses.add(l));
    byCase.set(s.receipt.caseId, e);
  }
  const failedCases = [...byCase]
    .filter(([, e]) => e.failedSeeds > 0)
    .map(([id, e]) => {
      const c = cases.get(id);
      return {
        caseId: id,
        title: c?.title ?? id,
        family: c?.family ?? -1,
        familyTitle: c ? FAMILY_TITLES[c.family] : "",
        failedSeeds: e.failedSeeds,
        seeds: e.seeds,
        losses: [...e.losses].sort(),
        expectedBehaviour: c?.expectedBehaviour ?? "",
      };
    })
    .sort((a, b) => a.family - b.family || a.caseId.localeCompare(b.caseId));

  const holdout = FAMILY_TITLES.map((title, family) => {
    const rs = bundle.holdout.results.filter((r) => r.family === family);
    const counts: Record<string, number> = {};
    for (const r of rs) for (const l of r.losses) counts[l] = (counts[l] ?? 0) + 1;
    return { family, title, critical: isCritical(family), sessions: rs.length, losses: counts };
  }).filter((h) => h.sessions > 0);

  return { rating, failedCases, holdout };
}
