import { getAddress, isHex, type Address, type Hex } from "viem";
import type { Enclave } from "../attest/enclave.ts";
import type { DstackEvent } from "../attest/rtmr.ts";
import type { SignedBundle, RunJob } from "../attest/cosign.ts";
import type { SealRecipient } from "../harness/bundle.ts";
import { signRequest } from "./auth.ts";

/**
 * Harness node -> coordinator API (served by the Bollard API on Vercel, Phase 6). Every request is signed by
 * the enclave key (see auth.ts); the API rejects keys that are not active on-chain.
 *
 *   POST /api/node/hello      announce public key + attestation (also used before the key is active)
 *   POST /api/node/claim      -> { job: NodeJob | null }
 *   POST /api/node/bundle     lead uploads the signed bundle and its report signature
 *   POST /api/node/cosign     co-signer uploads its report signature, or its refusal with reasons
 *
 * The coordinator is not trusted: claim() only checks the job is well-formed; main.ts then checks every fact
 * in it against the node's own pinned view of the chain (jobCheck.ts) before running, sealing or signing.
 */

export type NodeJob =
  | { role: "lead"; job: RunJob; cosigners: SealRecipient[] }
  | { role: "cosign"; job: RunJob; signed: SignedBundle };

export class NodeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly enclave: Enclave,
  ) {}

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const body = JSON.stringify(payload, (_, v) => (typeof v === "bigint" ? v.toString() : v));
    const headers = await signRequest(this.enclave, "POST", path, body);
    const r = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`);
    return (await r.json()) as T;
  }

  hello(a: { attester: Address; publicKey: Hex; quote: Hex; eventLog: DstackEvent[]; composeHash: Hex; appCompose: string }) {
    return this.post<{ ok: boolean }>("/api/node/hello", a);
  }

  /** Big numbers arrive as decimal strings; revive them for the harness. Malformed jobs throw. */
  async claim(): Promise<{ job: NodeJob | null }> {
    const r = await this.post<{ job: NodeJob | null }>("/api/node/claim", {});
    if (r.job) wellFormed(r.job);
    return r;
  }

  submitBundle(signed: SignedBundle, report: { digest: Hex; signature: Hex }) {
    return this.post<{ ok: boolean }>("/api/node/bundle", { signed, report });
  }

  submitCosign(bundleHash: Hex, result: { ok: true; digest: Hex; signature: Hex } | { ok: false; problems: string[] }) {
    return this.post<{ ok: boolean }>("/api/node/cosign", { bundleHash, result });
  }
}

const bytes32 = (v: unknown, what: string): Hex => {
  if (!isHex(v, { strict: true }) || v.length !== 66) throw new Error(`claim: malformed ${what}`);
  return v;
};

/** Shape checks and normalisation only; the facts are checked on-chain by jobCheck.ts. */
function wellFormed(j: NodeJob): void {
  if (!j || (j.role !== "lead" && j.role !== "cosign") || typeof j.job !== "object" || j.job === null) throw new Error("claim: malformed job");
  const job = j.job;
  if (!Number.isSafeInteger(job.chainId)) throw new Error("claim: malformed chainId");
  job.registry = getAddress(job.registry);
  job.agentRegistry = getAddress(job.agentRegistry);
  job.agentId = BigInt(job.agentId);
  job.requestId = BigInt(job.requestId);
  job.versionHash = bytes32(job.versionHash, "versionHash");
  job.requestNextBlockHash = bytes32(job.requestNextBlockHash, "requestNextBlockHash");
  if (j.role === "lead") {
    if (!Array.isArray(j.cosigners)) throw new Error("claim: malformed cosigners");
    j.cosigners = j.cosigners.map((c) => {
      if (!isHex(c?.publicKey, { strict: true })) throw new Error("claim: malformed co-signer public key");
      return { address: getAddress(c.address), publicKey: c.publicKey };
    });
  } else if (typeof j.signed?.bundle !== "object" || j.signed.bundle === null) {
    throw new Error("claim: malformed signed bundle");
  }
}
