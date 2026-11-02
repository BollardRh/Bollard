import type { Address, Hex } from "viem";
import type { AttackCase } from "../corpus/schema.ts";
import { canonicalJson } from "../corpus/canonical.ts";
import { holdoutCommit, leafOf, merkleRoot } from "../corpus/merkle.ts";
import type { RatingReport } from "../chain/report.ts";
import { seal } from "../attest/sealedBox.ts";
import { evaluateLosses } from "./losses.ts";
import { MockChain } from "./mockChain.ts";
import { hashOf, observation, type RunResult, type Session } from "./runner.ts";
import { score, type RunReceipt } from "./scoring.ts";
import { applyAction } from "./simWallet.ts";
import { expandVariant, variantHash } from "./variants.ts";

/**
 * Run bundle (backend doc §4.3, §5.7). Everything a co-signer needs to re-derive the result without
 * re-querying the agent. Public sessions are in the clear; holdout sessions are sealed to each co-signer's
 * enclave key and only their leaf, family and losses are public ("holdout results reveal only the family
 * and the loss type").
 */

export interface HoldoutResult {
  leaf: Hex;
  family: number;
  losses: string[];
}

export interface BundleReportMeta {
  chainId: number;
  registry: Address; // RatingRegistry, the EIP-712 verifyingContract
  agentRegistry: Address;
  agentId: string;
  versionHash: Hex;
  requestId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface RunBundle {
  version: "bollard-bundle/2";
  report: BundleReportMeta;
  runId: string;
  agentEndpoint: string;
  corpusRoot: Hex;
  holdoutCommit: Hex;
  seedKey: Hex;
  seeds: number;
  attestation: { leadKey: Address; quoteHash: Hex; tlsCertFingerprint: string };
  sessions: Session[];
  holdout: { results: HoldoutResult[]; sealed: Record<string, Hex> };
  runsRoot: Hex;
  score: number;
  grade: number;
  testedMask: number;
  failedMask: number;
}

export interface BundleMeta {
  report: BundleReportMeta;
  runId: string;
  agentEndpoint: string;
  corpusRoot: Hex;
  holdoutCommit: Hex;
  seedKey: Hex;
  seeds: number;
  attestation: RunBundle["attestation"];
}

export interface SealRecipient {
  address: Address;
  publicKey: Hex;
}

export function buildBundle(run: RunResult, meta: BundleMeta, recipients: readonly SealRecipient[] = []): RunBundle {
  const pub = run.sessions.filter((s) => !s.receipt.holdout);
  const hold = run.sessions.filter((s) => s.receipt.holdout);
  const sealed: Record<string, Hex> = {};
  if (hold.length) {
    const plaintext = canonicalJson(hold);
    for (const r of recipients) sealed[r.address.toLowerCase()] = seal(r.publicKey, plaintext);
  }
  return {
    version: "bollard-bundle/2",
    ...meta,
    sessions: pub,
    holdout: {
      results: hold.map((s) => ({ leaf: leafOf(s.receipt), family: s.receipt.family, losses: s.receipt.losses })),
      sealed,
    },
    runsRoot: run.runsRoot,
    score: run.score,
    grade: run.grade,
    testedMask: run.testedMask,
    failedMask: run.failedMask,
  };
}

export const bundleHash = (b: RunBundle): Hex => hashOf(b);

/** The EIP-712 report every signer of this bundle signs. */
export function reportOf(b: RunBundle): RatingReport {
  return {
    agentRegistry: b.report.agentRegistry,
    agentId: BigInt(b.report.agentId),
    versionHash: b.report.versionHash,
    requestId: BigInt(b.report.requestId),
    corpusRoot: b.corpusRoot,
    holdoutCommit: b.holdoutCommit,
    runsRoot: b.runsRoot,
    seeds: b.seeds,
    score: b.score,
    grade: b.grade,
    testedMask: b.testedMask,
    failedMask: b.failedMask,
    issuedAt: BigInt(b.report.issuedAt),
    expiresAt: BigInt(b.report.expiresAt),
  };
}

// ------------------------------------------------------------------ verification
function verifySessions(
  b: RunBundle,
  sessions: readonly Session[],
  cases: ReadonlyMap<string, AttackCase>,
  label: string,
  problems: string[],
): void {
  const ctx = { runId: b.runId, seedKey: b.seedKey };
  const seen = new Set<string>();
  for (const { receipt: r, transcript } of sessions) {
    const tag = `${label}${r.caseId}#${r.seed}`;
    if (seen.has(`${r.caseId}#${r.seed}`)) problems.push(`${tag}: duplicate session`);
    seen.add(`${r.caseId}#${r.seed}`);
    const c = cases.get(r.caseId);
    if (!c) {
      problems.push(`${tag}: unknown case`);
      continue;
    }
    if (r.seed < 0 || r.seed >= b.seeds) problems.push(`${tag}: seed out of range`);
    const v = expandVariant(c, r.seed, b.seedKey);
    if (r.family !== c.family) problems.push(`${tag}: family mismatch`);
    if (r.variantHash !== variantHash(v)) problems.push(`${tag}: variant hash mismatch`);
    if (r.transcriptHash !== hashOf(transcript)) problems.push(`${tag}: transcript hash mismatch`);

    const chain = MockChain.from(v);
    transcript.forEach((t, i) => {
      if (t.turn !== i) problems.push(`${tag}: turn ${i} out of order`);
      const obs = observation(v, chain, transcript.slice(0, i), i, ctx);
      if (t.obsHash !== hashOf(obs)) problems.push(`${tag}: observation ${i} mismatch`);
      const applied = t.actions.map((a) => applyAction(chain, a, i));
      if (canonicalJson(applied) !== canonicalJson(t.applied)) problems.push(`${tag}: tool results ${i} mismatch`);
    });
    if (transcript.length !== Math.min(v.turns.length, 8)) problems.push(`${tag}: wrong number of turns`);

    const losses = evaluateLosses(v, transcript);
    if (canonicalJson(losses) !== canonicalJson(r.losses)) problems.push(`${tag}: losses mismatch`);
    if (r.outcome !== (losses.length ? "loss" : "clean")) problems.push(`${tag}: outcome mismatch`);
  }
  for (const id of cases.keys()) {
    for (let s = 0; s < b.seeds; s++) if (!seen.has(`${id}#${s}`)) problems.push(`${label}${id}#${s}: missing session`);
  }
}

export interface HoldoutMaterial {
  cases: readonly AttackCase[];
  salt: Hex;
  sessions: readonly Session[];
}

/**
 * Co-signer check: rebuild every variant, replay every transcript, recompute losses, receipts, runsRoot,
 * score, masks and grade. With `holdout`, the sealed holdout sessions are checked the same way and tied to
 * the published holdoutCommit. Any problem means the bundle must not be signed.
 */
export function verifyBundle(
  b: RunBundle,
  publicCases: ReadonlyMap<string, AttackCase>,
  holdout?: HoldoutMaterial,
): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (b.version !== "bollard-bundle/2") problems.push("unsupported bundle version");
  if (b.sessions.some((s) => s.receipt.holdout)) problems.push("holdout session in the public part");
  verifySessions(b, b.sessions, publicCases, "", problems);

  if (holdout) {
    const hCases = new Map(holdout.cases.map((c) => [c.id, c]));
    if (holdoutCommit(merkleRoot(holdout.cases.map(leafOf)), holdout.salt) !== b.holdoutCommit) {
      problems.push("holdout set does not match holdoutCommit");
    }
    if (holdout.sessions.some((s) => !s.receipt.holdout)) problems.push("public session in the holdout part");
    verifySessions(b, holdout.sessions, hCases, "holdout ", problems);
    const fromSessions = holdout.sessions
      .map((s) => canonicalJson({ leaf: leafOf(s.receipt), family: s.receipt.family, losses: s.receipt.losses }))
      .sort();
    const published = b.holdout.results.map((r) => canonicalJson(r)).sort();
    if (canonicalJson(fromSessions) !== canonicalJson(published)) problems.push("holdout results do not match the sealed sessions");
  } else if (b.holdout.results.length) {
    problems.push("bundle has holdout results but no holdout material to check them");
  }

  const receipts: RunReceipt[] = b.sessions.map((s) => s.receipt);
  const leaves = [...receipts.map(leafOf), ...b.holdout.results.map((r) => r.leaf)];
  if (leaves.length === 0 || merkleRoot(leaves) !== b.runsRoot) problems.push("runsRoot mismatch");

  const forScore = [
    ...receipts,
    ...b.holdout.results.map((r) => ({ ...r, outcome: r.losses.length ? ("loss" as const) : ("clean" as const) })),
  ] as RunReceipt[];
  const sc = score(forScore);
  if (sc.score !== b.score) problems.push("score mismatch");
  if (sc.grade !== b.grade) problems.push("grade mismatch");
  if (sc.testedMask !== b.testedMask) problems.push("testedMask mismatch");
  if (sc.failedMask !== b.failedMask) problems.push("failedMask mismatch");

  return { ok: problems.length === 0, problems };
}
