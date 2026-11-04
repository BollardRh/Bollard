import { randomBytes } from "node:crypto";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  keccak256,
  recoverTypedDataAddress,
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

/**
 * EIP-712 typed data for the two builder actions (security review: the old personal_sign texts had no domain,
 * expiry or nonce, so an old setEndpoint signature could be replayed to revert the endpoint and fetch the token).
 * Domain binds the chain and the RatingRegistry; every signature carries a deadline at most an hour out, and
 * setEndpoint signatures must carry a strictly newer issuedAt than the last one accepted for the request.
 */
export const EIP712_TYPES = {
  SetEndpoint: [
    { name: "requestId", type: "uint256" },
    { name: "endpoint", type: "string" },
    { name: "issuedAt", type: "uint64" },
    { name: "deadline", type: "uint64" },
  ],
  ReadFixList: [
    { name: "ratingId", type: "uint256" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

/** Longest a signed builder action may stay valid, and how far ahead of the server clock issuedAt may be. */
export const MAX_DEADLINE_S = 3600;
const MAX_CLOCK_SKEW_S = 300;

export const eip712Domain = (deps: Pick<AppDeps, "chain">) =>
  ({ name: "Bollard", version: "1", chainId: deps.chain.chainId, verifyingContract: getAddress(deps.chain.contracts.ratingRegistry) }) as const;

export const setEndpointTypedData = (deps: Pick<AppDeps, "chain">, m: { requestId: string; endpoint: string; issuedAt: number; deadline: number }) => ({
  domain: eip712Domain(deps),
  types: EIP712_TYPES,
  primaryType: "SetEndpoint" as const,
  message: { requestId: BigInt(m.requestId), endpoint: m.endpoint, issuedAt: BigInt(m.issuedAt), deadline: BigInt(m.deadline) },
});

export const fixListTypedData = (deps: Pick<AppDeps, "chain">, m: { ratingId: string; deadline: number }) => ({
  domain: eip712Domain(deps),
  types: EIP712_TYPES,
  primaryType: "ReadFixList" as const,
  message: { ratingId: BigInt(m.ratingId), deadline: BigInt(m.deadline) },
});

const nowS = (deps: AppDeps) => Math.floor(deps.now() / 1000);

/** Same chain as the domain, deadline not passed and at most an hour out. */
function checkWindow(deps: AppDeps, chainId: number, deadline: number) {
  if (chainId !== deps.chain.chainId) throw new TRPCError({ code: "BAD_REQUEST", message: `this API serves chain ${deps.chain.chainId}` });
  const now = nowS(deps);
  if (deadline < now) throw new TRPCError({ code: "FORBIDDEN", message: "signature expired; sign again" });
  if (deadline > now + MAX_DEADLINE_S) throw new TRPCError({ code: "BAD_REQUEST", message: `deadline must be within ${MAX_DEADLINE_S / 60} minutes` });
}

/**
 * The payer names the endpoint the harness will test, by signing SetEndpoint typed data. Returns the per-run
 * bearer token the endpoint should accept (doc §5.1).
 */
export async function setEndpoint(
  deps: AppDeps,
  i: { chainId: number; requestId: string; endpoint: string; issuedAt: number; deadline: number; signature: Hex },
) {
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
  checkWindow(deps, i.chainId, i.deadline);
  if (i.issuedAt > nowS(deps) + MAX_CLOCK_SKEW_S || i.issuedAt > i.deadline) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "issuedAt is in the future" });
  }
  const [req] = await deps.db
    .select()
    .from(runRequests)
    .where(and(eq(runRequests.chainId, i.chainId), eq(runRequests.requestId, i.requestId)));
  if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "request not indexed yet; try again in a minute" });
  if (req.status === "rated" || req.status === "refunded") throw new TRPCError({ code: "CONFLICT", message: `request is ${req.status}` });
  const signer = await recoverTypedDataAddress({ ...setEndpointTypedData(deps, i), signature: i.signature });
  if (lc(signer) !== lc(req.payer)) throw new TRPCError({ code: "FORBIDDEN", message: "signature is not from the payer" });
  // Replay guard: only a signature issued after the last accepted one may change the endpoint (checked in the
  // same statement, so two concurrent submissions cannot both pass). The token is minted once and kept.
  const [row] = await deps.db
    .update(runRequests)
    .set({
      endpoint: u.toString().replace(/\/$/, ""),
      endpointSignedAt: i.issuedAt,
      runToken: sql`coalesce(${runRequests.runToken}, ${randomBytes(32).toString("hex")})`,
      updatedAt: new Date(deps.now()),
    })
    .where(
      and(
        eq(runRequests.chainId, i.chainId),
        eq(runRequests.requestId, i.requestId),
        or(isNull(runRequests.endpointSignedAt), lt(runRequests.endpointSignedAt, i.issuedAt)),
      ),
    )
    .returning({ runToken: runRequests.runToken });
  if (!row?.runToken) {
    throw new TRPCError({ code: "CONFLICT", message: "a newer endpoint signature was already accepted; sign again" });
  }
  return { ok: true as const, runToken: row.runToken };
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

/** Owner-only detail: which public cases lost and how, plus holdout loss counts per family. */
export async function fixList(deps: AppDeps, i: { chainId: number; ratingId: string; deadline: number; signature: Hex }) {
  checkWindow(deps, i.chainId, i.deadline);
  const rating = await ratingById(deps, i.chainId, i.ratingId);
  if (!rating) throw new TRPCError({ code: "NOT_FOUND", message: "rating not found" });
  const signer = await recoverTypedDataAddress({ ...fixListTypedData(deps, i), signature: i.signature });
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
