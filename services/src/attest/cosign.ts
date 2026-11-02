import { getAddress, keccak256, recoverMessageAddress, type Address, type Hex } from "viem";
import type { AttackCase } from "../corpus/schema.ts";
import { reportDigest } from "../chain/report.ts";
import type { AgentClient } from "../harness/batp.ts";
import { HttpAgentClient } from "../harness/agentClient.ts";
import {
  buildBundle,
  bundleHash,
  reportOf,
  verifyBundle,
  type RunBundle,
  type SealRecipient,
} from "../harness/bundle.ts";
import { seedKeyOf } from "../harness/rng.ts";
import { runRequest, type Session } from "../harness/runner.ts";
import type { Enclave } from "./enclave.ts";
import { tlsFingerprint } from "./tls.ts";

/**
 * Lead / co-sign protocol (backend doc §5.7).
 *   1. The coordinator assigns a lead and >= 1 co-signer from different attesters.
 *   2. The lead runs all cases x seeds, builds the bundle, signs bundleHash with its enclave key, seals the
 *      holdout part to each co-signer's enclave key, and signs the EIP-712 report.
 *   3. Each co-signer checks the lead's key is active, replays everything, and signs the same report only on
 *      an exact match. It never re-queries the agent.
 *   4. The coordinator posts postRating(report, keys, sigs).
 */

export const LAUNCH_PARAMS = { maxReportAge: 86_400, maxTtl: 30 * 86_400, minSeeds: 8 } as const;

export interface SignedBundle {
  bundle: RunBundle;
  bundleHash: Hex;
  leadSig: Hex;
}

export interface HoldoutSet {
  cases: readonly AttackCase[];
  salt: Hex;
}

export interface RunJob {
  chainId: number;
  registry: Address;
  agentRegistry: Address;
  agentId: bigint;
  versionHash: Hex;
  requestId: bigint;
  requestNextBlockHash: Hex; // blockhash(requestBlock + 1), fixes the seed key
  endpoint: string;
  runToken: string;
}

export async function signReport(b: RunBundle, enclave: Enclave): Promise<{ digest: Hex; signature: Hex }> {
  const digest = reportDigest(b.report.chainId, b.report.registry, reportOf(b));
  return { digest, signature: await enclave.signDigest(digest) };
}

/** Lead side: run, bundle, seal, sign. */
export async function leadRun(opts: {
  job: RunJob;
  publicCases: readonly AttackCase[];
  holdout?: HoldoutSet;
  corpusRoot: Hex;
  holdoutCommit: Hex;
  enclave: Enclave;
  quoteHash: Hex;
  cosigners: readonly SealRecipient[];
  seeds?: number;
  agent?: AgentClient;
  now?: number;
}): Promise<{ signed: SignedBundle; report: { digest: Hex; signature: Hex } }> {
  const { job } = opts;
  const seeds = opts.seeds ?? LAUNCH_PARAMS.minSeeds;
  const seedKey = seedKeyOf(job.requestId, opts.corpusRoot, job.requestNextBlockHash);
  const runId = keccak256(`0x${job.requestId.toString(16).padStart(64, "0")}${seedKey.slice(2)}`);
  const holdoutCases = opts.holdout?.cases ?? [];
  const run = await runRequest({
    cases: [...opts.publicCases, ...holdoutCases],
    agent: opts.agent ?? new HttpAgentClient(job.endpoint, job.runToken),
    ctx: { runId, seedKey },
    seeds,
    holdoutIds: new Set(holdoutCases.map((c) => c.id)),
  });
  const issuedAt = Math.floor((opts.now ?? Date.now()) / 1000);
  const bundle = buildBundle(
    run,
    {
      report: {
        chainId: job.chainId,
        registry: job.registry,
        agentRegistry: job.agentRegistry,
        agentId: job.agentId.toString(),
        versionHash: job.versionHash,
        requestId: job.requestId.toString(),
        issuedAt,
        expiresAt: issuedAt + LAUNCH_PARAMS.maxTtl,
      },
      runId,
      agentEndpoint: job.endpoint,
      corpusRoot: opts.corpusRoot,
      holdoutCommit: opts.holdoutCommit,
      seedKey,
      seeds,
      attestation: { leadKey: opts.enclave.address, quoteHash: opts.quoteHash, tlsCertFingerprint: await tlsFingerprint(job.endpoint) },
    },
    opts.cosigners,
  );
  const hash = bundleHash(bundle);
  const leadSig = await opts.enclave.signMessage({ raw: hash });
  return { signed: { bundle, bundleHash: hash, leadSig }, report: await signReport(bundle, opts.enclave) };
}

export type CosignResult = { ok: true; digest: Hex; signature: Hex } | { ok: false; problems: string[] };

/** Co-signer side: verify everything, then sign the identical EIP-712 report. */
export async function cosign(opts: {
  signed: SignedBundle;
  publicCases: readonly AttackCase[];
  holdout?: HoldoutSet;
  me: Enclave;
  isActiveKey(key: Address): Promise<boolean>;
  now?: number;
}): Promise<CosignResult> {
  const { signed, me } = opts;
  const b = signed.bundle;
  const problems: string[] = [];

  // 1. the bundle is exactly what the lead signed, and the lead is an active, different enclave key
  if (bundleHash(b) !== signed.bundleHash) problems.push("bundle hash mismatch");
  let lead: Address | undefined;
  try {
    lead = await recoverMessageAddress({ message: { raw: signed.bundleHash }, signature: signed.leadSig });
  } catch {
    problems.push("bad lead signature");
  }
  if (lead && getAddress(lead) !== getAddress(b.attestation.leadKey)) problems.push("lead signature does not match leadKey");
  if (getAddress(b.attestation.leadKey) === getAddress(me.address)) problems.push("lead and co-signer are the same key");
  if (lead && !(await opts.isActiveKey(lead))) problems.push("lead enclave key is not active");
  if (problems.length) return { ok: false, problems };

  // 2. open the holdout sealed to this enclave
  let holdoutSessions: Session[] | undefined;
  if (opts.holdout) {
    const blob = b.holdout.sealed[me.address.toLowerCase()];
    if (!blob) return { ok: false, problems: ["no holdout sealed to this co-signer"] };
    try {
      holdoutSessions = JSON.parse(me.open(blob).toString("utf8")) as Session[];
    } catch {
      return { ok: false, problems: ["cannot open sealed holdout"] };
    }
  }

  // 3. replay and rescore everything
  const v = verifyBundle(
    b,
    new Map(opts.publicCases.map((c) => [c.id, c])),
    opts.holdout && holdoutSessions ? { cases: opts.holdout.cases, salt: opts.holdout.salt, sessions: holdoutSessions } : undefined,
  );
  problems.push(...v.problems);

  // 4. report shape the registry will accept
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const { issuedAt, expiresAt } = b.report;
  if (b.seeds < LAUNCH_PARAMS.minSeeds) problems.push("too few seeds");
  if (issuedAt > now + 60) problems.push("issuedAt in the future");
  if (now - issuedAt > LAUNCH_PARAMS.maxReportAge) problems.push("report too old");
  if (expiresAt <= now || expiresAt - issuedAt > LAUNCH_PARAMS.maxTtl) problems.push("bad expiry");

  if (problems.length) return { ok: false, problems };
  return { ok: true, ...(await signReport(b, me)) };
}
