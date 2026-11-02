import { hexToBytes, type Address, type Hex } from "viem";
import type { DcapVerifier } from "./dcap.ts";
import { composeHashOf, replayRtmr3, type DstackEvent } from "./rtmr.ts";
import { keyBinding, osMeasurement, parseTdxV4 } from "./tdx.ts";

/**
 * Watcher check for every EnclaveKeyRegistered event (doc §4.2 step 5). Any bonded attester runs it; the
 * keeper runs it for everyone. A failure means: call challengeKey(key) inside the window (or proveBadQuote
 * when an on-chain DCAP verifier is configured and the signature is bad).
 *
 * Checks, all of which must pass:
 *   1. DCAP: the quote's signature chain and TCB status verify
 *   2. RTMR3 replayed from the published event log equals the quote's RTMR3
 *   3. the event log's compose-hash event equals SHA-256(app-compose.json) and the claimed compose hash
 *   4. REPORTDATA binds this key to this chain and registry, and carries the same compose hash
 *   5. optional: the OS measurement is on the allowlist the watcher expects
 */
export interface Registration {
  quote: Hex | Uint8Array;
  eventLog: DstackEvent[];
  appCompose: string;
  composeHash: Hex;
  key: Address;
  chainId: number;
  registry: Address;
}

export interface Verdict {
  ok: boolean;
  reasons: string[];
  osMeasurement?: Hex;
}

export async function verifyRegistration(
  r: Registration,
  dcap: DcapVerifier,
  allowedOs?: ReadonlySet<string>,
): Promise<Verdict> {
  const reasons: string[] = [];
  const q = typeof r.quote === "string" ? hexToBytes(r.quote) : r.quote;
  let f;
  try {
    f = parseTdxV4(q);
  } catch (e) {
    return { ok: false, reasons: [(e as Error).message] };
  }
  const os = osMeasurement(f);

  if (!(await dcap.verify(q))) reasons.push(`DCAP (${dcap.name}) rejected the quote`);
  if (!Buffer.from(replayRtmr3(r.eventLog)).equals(Buffer.from(f.rtmr3))) reasons.push("RTMR3 replay mismatch");

  const composeEvents = r.eventLog.filter((e) => e.imr === 3 && e.event === "compose-hash");
  if (composeEvents.length !== 1) reasons.push("expected exactly one compose-hash event");
  const evt = composeEvents[0];
  const fromCompose = composeHashOf(r.appCompose);
  if (evt && `0x${evt.event_payload.toLowerCase()}` !== fromCompose) reasons.push("compose-hash event != SHA-256(app-compose)");
  if (fromCompose !== r.composeHash.toLowerCase()) reasons.push("claimed compose hash != SHA-256(app-compose)");

  const lo = `0x${Buffer.from(f.reportData.slice(0, 32)).toString("hex")}`;
  const hi = `0x${Buffer.from(f.reportData.slice(32, 64)).toString("hex")}`;
  if (lo !== keyBinding(r.chainId, r.registry, r.key).toLowerCase()) reasons.push("REPORTDATA does not bind this key/chain/registry");
  if (hi !== r.composeHash.toLowerCase()) reasons.push("REPORTDATA compose hash mismatch");

  if (allowedOs && !allowedOs.has(os.toLowerCase())) reasons.push("OS measurement not on the expected allowlist");

  return { ok: reasons.length === 0, reasons, osMeasurement: os };
}
