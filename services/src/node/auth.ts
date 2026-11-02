import { createHash, randomBytes } from "node:crypto";
import { getAddress, isAddress, recoverMessageAddress, type Address, type Hex } from "viem";
import type { Enclave } from "../attest/enclave.ts";

/**
 * Harness nodes never hold database credentials. Every call to /api/node/* is signed by the node's
 * enclave key (EIP-191) over method, path, timestamp, nonce and body hash; the API accepts it only if the
 * key is active on-chain, the timestamp is fresh and the nonce is new.
 */

export const NODE_AUTH_VERSION = "BOLLARD-NODE-V1";
export const MAX_SKEW_SECONDS = 60;

export const HEADERS = {
  key: "x-bollard-key",
  ts: "x-bollard-ts",
  nonce: "x-bollard-nonce",
  sig: "x-bollard-sig",
} as const;

export function signingString(method: string, path: string, ts: number, nonce: string, body: string): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return `${NODE_AUTH_VERSION}\n${method.toUpperCase()}\n${path}\n${ts}\n${nonce}\n${bodyHash}`;
}

export async function signRequest(enclave: Enclave, method: string, path: string, body: string, now = Date.now()) {
  const ts = Math.floor(now / 1000);
  const nonce = randomBytes(16).toString("hex");
  const sig = await enclave.signMessage(signingString(method, path, ts, nonce, body));
  return { [HEADERS.key]: enclave.address, [HEADERS.ts]: String(ts), [HEADERS.nonce]: nonce, [HEADERS.sig]: sig };
}

export interface VerifyDeps {
  isActiveKey(key: Address): Promise<boolean>;
  useNonce(key: Address, nonce: string): Promise<boolean>;
  now?: number;
}

export type AuthResult = { ok: true; key: Address } | { ok: false; status: 401 | 403; reason: string };

export async function verifyRequest(
  headers: Record<string, string | undefined>,
  method: string,
  path: string,
  body: string,
  deps: VerifyDeps,
): Promise<AuthResult> {
  const key = headers[HEADERS.key];
  const ts = Number(headers[HEADERS.ts]);
  const nonce = headers[HEADERS.nonce];
  const sig = headers[HEADERS.sig] as Hex | undefined;
  if (!key || !isAddress(key) || !nonce || !sig || !Number.isFinite(ts)) return { ok: false, status: 401, reason: "missing auth headers" };
  if (!/^[0-9a-f]{32}$/.test(nonce)) return { ok: false, status: 401, reason: "bad nonce" };
  const now = Math.floor((deps.now ?? Date.now()) / 1000);
  if (Math.abs(now - ts) > MAX_SKEW_SECONDS) return { ok: false, status: 401, reason: "stale timestamp" };

  let signer: Address;
  try {
    signer = await recoverMessageAddress({ message: signingString(method, path, ts, nonce, body), signature: sig });
  } catch {
    return { ok: false, status: 401, reason: "bad signature" };
  }
  if (getAddress(signer) !== getAddress(key)) return { ok: false, status: 401, reason: "signature does not match key" };
  if (!(await deps.isActiveKey(signer))) return { ok: false, status: 403, reason: "enclave key not active" };
  if (!(await deps.useNonce(signer, nonce))) return { ok: false, status: 401, reason: "nonce already used" };
  return { ok: true, key: signer };
}
