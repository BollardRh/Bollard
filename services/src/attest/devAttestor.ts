import { createHash } from "node:crypto";
import { bytesToHex, hexToBytes, type Address, type Hex } from "viem";
import { OFFSETS, osMeasurement, reportData, TDX_MIN_LEN } from "./tdx.ts";
import { replayRtmr3, type DstackEvent } from "./rtmr.ts";

/**
 * DEV ATTESTOR — UNSAFE, TESTNET AND LOCAL CHAINS ONLY.
 *
 * Builds synthetic TDX v4 quotes that parse exactly like real ones (so AttesterRegistry accepts them when
 * governance allowlists DEV_OS_MEASUREMENT), but carry no Intel signature at all. Anyone can make one, so
 * DEV_OS_MEASUREMENT must never be allowlisted on a mainnet. The measurement registers are filled with a
 * recognisable marker so the dev verifier, watchers and humans can all tell these quotes apart.
 */

export const DEV_MARKER = "BOLLARD-DEV-ATTESTOR-UNSAFE";
export const DEV_CHAINS = new Set([46630, 31337]); // Robinhood Chain testnet, local anvil/hardhat

const reg = (name: string) => new Uint8Array(createHash("sha384").update(`${DEV_MARKER}:${name}`).digest());

export const DEV_REGISTERS = { mrtd: reg("MRTD"), rtmr0: reg("RTMR0"), rtmr1: reg("RTMR1"), rtmr2: reg("RTMR2") } as const;
export const DEV_OS_MEASUREMENT: Hex = osMeasurement(DEV_REGISTERS);

export function isDevQuote(q: Uint8Array): boolean {
  if (q.length < TDX_MIN_LEN) return false;
  const mrtd = q.slice(OFFSETS.mrtd, OFFSETS.mrtd + 48);
  return Buffer.from(mrtd).equals(Buffer.from(DEV_REGISTERS.mrtd));
}

/** A dstack-shaped IMR-3 event log whose compose-hash event names `composeHash`. */
export function devEventLog(composeHash: Hex, instanceId: string): DstackEvent[] {
  const hex = (s: string) => Buffer.from(s, "utf8").toString("hex");
  return [
    { imr: 3, event: "system-preparing", event_payload: "" },
    { imr: 3, event: "app-id", event_payload: hex("bollard-harness") },
    { imr: 3, event: "compose-hash", event_payload: composeHash.slice(2).toLowerCase() },
    { imr: 3, event: "instance-id", event_payload: hex(instanceId) },
    { imr: 3, event: "key-provider", event_payload: hex(DEV_MARKER) },
  ];
}

export interface DevQuote {
  quote: Hex;
  eventLog: DstackEvent[];
}

/** Synthetic quote binding `key` and `composeHash` for AttesterRegistry at `registry` on `chainId`. */
export function devQuote(opts: { chainId: number; registry: Address; key: Address; composeHash: Hex; instanceId?: string }): DevQuote {
  if (!DEV_CHAINS.has(opts.chainId)) throw new Error(`dev attestor refused on chain ${opts.chainId}`);
  const eventLog = devEventLog(opts.composeHash, opts.instanceId ?? opts.key.toLowerCase());
  const q = new Uint8Array(TDX_MIN_LEN + 4); // + empty signature-data length, like a v4 quote with no signature
  q[0] = 4; // version 4 (u16 LE)
  q[2] = 2; // attestation key type: ECDSA-256 (informational)
  q[4] = 0x81; // tee type TDX (u32 LE)
  q.set(DEV_REGISTERS.mrtd, OFFSETS.mrtd);
  q.set(DEV_REGISTERS.rtmr0, OFFSETS.rtmr0);
  q.set(DEV_REGISTERS.rtmr1, OFFSETS.rtmr1);
  q.set(DEV_REGISTERS.rtmr2, OFFSETS.rtmr2);
  q.set(replayRtmr3(eventLog), OFFSETS.rtmr3);
  q.set(hexToBytes(reportData(opts.chainId, opts.registry, opts.key, opts.composeHash)), OFFSETS.reportData);
  return { quote: bytesToHex(q), eventLog };
}
