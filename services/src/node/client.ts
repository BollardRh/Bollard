import type { Address, Hex } from "viem";
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

  claim() {
    return this.post<{ job: NodeJob | null }>("/api/node/claim", {});
  }

  submitBundle(signed: SignedBundle, report: { digest: Hex; signature: Hex }) {
    return this.post<{ ok: boolean }>("/api/node/bundle", { signed, report });
  }

  submitCosign(bundleHash: Hex, result: { ok: true; digest: Hex; signature: Hex } | { ok: false; problems: string[] }) {
    return this.post<{ ok: boolean }>("/api/node/cosign", { bundleHash, result });
  }
}
