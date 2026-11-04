import { BlockNotFoundError, createPublicClient, getAbiItem, getAddress, http, type Address, type Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { attesterRegistryAbi, ratingRegistryAbi } from "../chain/abis.ts";
import type { SealRecipient } from "../harness/bundle.ts";
import { seedKeyOf } from "../harness/rng.ts";
import type { RunJob, SignedBundle } from "../attest/cosign.ts";

/**
 * A harness node's own, pinned view of the chain. Nodes do not trust the coordinator they poll: before a lead
 * runs (and seals holdout transcripts) or a co-signer signs, every fact the job carries is re-read from the
 * node's own RPC and compared with the contracts the node was configured with (REGISTRY_RHC, ATTESTERS_RHC,
 * CHAIN_ID) and with the corpus it loaded itself. Any mismatch is a refusal: no run, no seal, no signature.
 */

export const REQ_OPEN = 1;
const ZERO = "0x0000000000000000000000000000000000000000";

export interface OnchainRequest {
  agentRegistry: Address;
  agentId: bigint;
  versionHash: Hex;
  status: number;
}

export interface NodeChain {
  /** Pinned by configuration, not by the coordinator. */
  readonly chainId: number;
  readonly ratingRegistry: Address;
  readonly attesterRegistry: Address;
  /** The root of the corpus this node loaded locally. */
  readonly corpusRoot: Hex;
  /** RatingRegistry.requests(requestId); agentRegistry is zero when the request does not exist. */
  request(requestId: bigint): Promise<OnchainRequest>;
  /**
   * The block holding RunRequested(requestId), found from the claimed hash of the block after it and proven by
   * the event log; null when that hash is not the block right after the request.
   */
  requestBlock(requestId: bigint, claimedNextBlockHash: Hex): Promise<bigint | null>;
  /** Canonical hash of block n, or null if it does not exist yet. */
  blockHash(n: bigint): Promise<Hex | null>;
  isActiveKey(key: Address): Promise<boolean>;
  /** AttesterRegistry.attesterOf(key); the zero address when the key was never registered. */
  attesterOf(key: Address): Promise<Address>;
}

/** Thrown by leadRun when the job fails the node's own checks. Nothing was run, sealed or signed. */
export class JobRefused extends Error {
  constructor(readonly problems: string[]) {
    super(`job refused: ${problems.join("; ")}`);
    this.name = "JobRefused";
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const isZero = (a: string) => same(a, ZERO);

interface Subject {
  chainId: number;
  registry: string;
  agentRegistry: string;
  agentId: bigint;
  versionHash: string;
  requestId: bigint;
}

/**
 * The job names an open on-chain request of the pinned registry, with the same subject, and the claimed
 * next-block hash is blockhash(requestBlock + 1) on this node's own RPC. Returns the verified hash when it is.
 */
async function checkRequest(chain: NodeChain, s: Subject, claimedNextBlockHash: Hex): Promise<{ problems: string[]; nextBlockHash?: Hex }> {
  const problems: string[] = [];
  if (s.chainId !== chain.chainId) problems.push(`chainId ${s.chainId} is not the pinned chain ${chain.chainId}`);
  if (!same(s.registry, chain.ratingRegistry)) problems.push(`registry ${s.registry} is not the pinned RatingRegistry ${chain.ratingRegistry}`);

  const req = await chain.request(s.requestId);
  if (isZero(req.agentRegistry)) {
    problems.push(`request ${s.requestId} does not exist on-chain`);
    return { problems };
  }
  if (req.status !== REQ_OPEN) problems.push(`request ${s.requestId} is not open (status ${req.status})`);
  if (!same(req.agentRegistry, s.agentRegistry)) problems.push("subject agentRegistry does not match the on-chain request");
  if (req.agentId !== s.agentId) problems.push("subject agentId does not match the on-chain request");
  if (!same(req.versionHash, s.versionHash)) problems.push("subject versionHash does not match the on-chain request");

  const requestBlock = await chain.requestBlock(s.requestId, claimedNextBlockHash);
  const next = requestBlock === null ? null : await chain.blockHash(requestBlock + 1n);
  if (!next || !same(next, claimedNextBlockHash)) {
    problems.push("requestNextBlockHash is not blockhash(requestBlock + 1) on this node's RPC");
    return { problems };
  }
  return { problems, nextBlockHash: next };
}

/** Lead side: run only for a real open request of the pinned registry, and seal only to genuine co-signers. */
export async function checkLeadJob(
  chain: NodeChain,
  a: { job: RunJob; corpusRoot: Hex; me: Address; cosigners: readonly SealRecipient[] },
): Promise<string[]> {
  const { job } = a;
  const { problems } = await checkRequest(chain, job, job.requestNextBlockHash);
  if (!same(a.corpusRoot, chain.corpusRoot)) problems.push(`corpus root ${a.corpusRoot} is not the local corpus root ${chain.corpusRoot}`);

  const myAttester = await chain.attesterOf(getAddress(a.me));
  if (isZero(myAttester)) problems.push("this node's enclave key has no attester on-chain");
  const seen = new Set<string>();
  for (const c of a.cosigners) {
    let address: Address;
    try {
      address = getAddress(c.address);
    } catch {
      problems.push(`co-signer ${String(c.address)}: malformed address`);
      continue;
    }
    const tag = `co-signer ${address}`;
    let derived: Address | undefined;
    try {
      derived = publicKeyToAddress(c.publicKey);
    } catch {
      /* malformed key, reported below */
    }
    if (!derived || !same(derived, address)) {
      problems.push(`${tag}: public key does not belong to the address`);
      continue;
    }
    if (same(address, a.me)) {
      problems.push(`${tag}: is this node's own key`);
      continue;
    }
    if (!(await chain.isActiveKey(address))) problems.push(`${tag}: enclave key is not active`);
    const attester = await chain.attesterOf(address);
    if (isZero(attester)) {
      problems.push(`${tag}: has no attester on-chain`);
      continue;
    }
    if (same(attester, myAttester)) problems.push(`${tag}: same attester as the lead`);
    if (seen.has(attester.toLowerCase())) problems.push(`${tag}: attester ${attester} already has a co-signer on this job`);
    seen.add(attester.toLowerCase());
  }
  return problems;
}

/**
 * Co-signer side: the bundle reports on the job's request of the pinned registry and chain, the job holds up
 * on-chain, the seed key derives from the block hash this node fetched itself and its local corpus root, and
 * the lead key is active under a different attester than this node's.
 */
export async function checkCosignJob(chain: NodeChain, a: { job: RunJob; signed: SignedBundle; me: Address }): Promise<string[]> {
  const { job } = a;
  const b = a.signed.bundle;
  const r = b.report;
  const problems: string[] = [];

  const bundleSubject: Subject = {
    chainId: r.chainId,
    registry: r.registry,
    agentRegistry: r.agentRegistry,
    agentId: BigInt(r.agentId),
    versionHash: r.versionHash,
    requestId: BigInt(r.requestId),
  };
  if (
    bundleSubject.chainId !== job.chainId ||
    !same(bundleSubject.registry, job.registry) ||
    bundleSubject.requestId !== job.requestId ||
    !same(bundleSubject.agentRegistry, job.agentRegistry) ||
    bundleSubject.agentId !== job.agentId ||
    !same(bundleSubject.versionHash, job.versionHash)
  ) {
    problems.push("bundle report does not match the job");
  }
  // the bundle is what gets signed, so the chain facts are checked against the bundle itself
  const req = await checkRequest(chain, bundleSubject, job.requestNextBlockHash);
  problems.push(...req.problems);
  if (!same(b.corpusRoot, chain.corpusRoot)) problems.push(`corpus root ${b.corpusRoot} is not the local corpus root ${chain.corpusRoot}`);
  if (req.nextBlockHash && !same(b.seedKey, seedKeyOf(bundleSubject.requestId, chain.corpusRoot, req.nextBlockHash))) {
    problems.push("seedKey is not derived from the request block hash and the local corpus root");
  }

  const lead = getAddress(b.attestation.leadKey);
  if (!(await chain.isActiveKey(lead))) problems.push("lead enclave key is not active");
  const [leadAttester, myAttester] = await Promise.all([chain.attesterOf(lead), chain.attesterOf(getAddress(a.me))]);
  if (isZero(myAttester)) problems.push("this node's enclave key has no attester on-chain");
  if (isZero(leadAttester)) problems.push("lead enclave key has no attester on-chain");
  else if (same(leadAttester, myAttester)) problems.push("lead key belongs to this node's attester");
  return problems;
}

// ---------------------------------------------------------------------------------------- RPC implementation

const runRequested = getAbiItem({ abi: ratingRegistryAbi, name: "RunRequested" });

/**
 * Opens the node's chain view on its own RPC and checks the pins: the RPC serves the configured chain, and the
 * pinned RatingRegistry points at the pinned AttesterRegistry. Throws on any mismatch (the node must not start).
 */
export async function openNodeChain(o: {
  rpcUrl: string;
  chainId: number;
  ratingRegistry: Address;
  attesterRegistry: Address;
  corpusRoot: Hex;
}): Promise<NodeChain> {
  const pub = createPublicClient({ transport: http(o.rpcUrl) });
  const ratingRegistry = getAddress(o.ratingRegistry);
  const attesterRegistry = getAddress(o.attesterRegistry);

  const rpcChainId = await pub.getChainId();
  if (rpcChainId !== o.chainId) throw new Error(`RPC serves chain ${rpcChainId}, not the configured CHAIN_ID ${o.chainId}`);
  const linked = await pub.readContract({ address: ratingRegistry, abi: ratingRegistryAbi, functionName: "attesters" });
  if (!same(linked, attesterRegistry)) {
    throw new Error(`RatingRegistry ${ratingRegistry} uses AttesterRegistry ${linked}, not the configured ${attesterRegistry}`);
  }

  return {
    chainId: o.chainId,
    ratingRegistry,
    attesterRegistry,
    corpusRoot: o.corpusRoot,
    async request(requestId) {
      const [agentRegistry, agentId, versionHash, , , status] = await pub.readContract({
        address: ratingRegistry,
        abi: ratingRegistryAbi,
        functionName: "requests",
        args: [requestId],
      });
      return { agentRegistry, agentId, versionHash, status };
    },
    async requestBlock(requestId, claimedNextBlockHash) {
      let next;
      try {
        next = await pub.getBlock({ blockHash: claimedNextBlockHash });
      } catch (e) {
        if (e instanceof BlockNotFoundError) return null;
        throw e;
      }
      if (next.number === null || next.number === 0n) return null;
      const logs = await pub.getLogs({ address: ratingRegistry, event: runRequested, args: { requestId }, blockHash: next.parentHash });
      return logs.length ? next.number - 1n : null;
    },
    async blockHash(n) {
      try {
        return (await pub.getBlock({ blockNumber: n })).hash;
      } catch (e) {
        if (e instanceof BlockNotFoundError) return null;
        throw e;
      }
    },
    isActiveKey: (key) => pub.readContract({ address: attesterRegistry, abi: attesterRegistryAbi, functionName: "isActiveKey", args: [key] }),
    async attesterOf(key) {
      return getAddress(await pub.readContract({ address: attesterRegistry, abi: attesterRegistryAbi, functionName: "attesterOf", args: [key] }));
    },
  };
}
