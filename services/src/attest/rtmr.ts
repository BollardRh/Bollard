import { createHash } from "node:crypto";

/**
 * dstack runtime event log (doc §4.2). RTMR3 binds the compose hash (harness image), instance id and
 * key provider. It starts as 48 zero bytes and each IMR-3 event extends it:
 *   RTMR3_new = SHA384(RTMR3_old || SHA384(event_payload))
 *
 * OPEN ITEM (doc §4.2 note): some dstack versions hash (type || name || payload) per event rather than the
 * payload alone. Lock this against the dstack version the harness image runs before mainnet; the dev
 * attestor and the verifier below use the same rule, so testnet stays self-consistent.
 */
export interface DstackEvent {
  imr: number;
  event: string;
  event_payload: string; // hex, no 0x
  digest?: string;
}

export function eventDigest(e: DstackEvent): Buffer {
  return createHash("sha384").update(Buffer.from(e.event_payload, "hex")).digest();
}

export function replayRtmr3(events: readonly DstackEvent[]): Buffer {
  let r = Buffer.alloc(48);
  for (const e of events.filter((x) => x.imr === 3)) {
    r = createHash("sha384").update(Buffer.concat([r, eventDigest(e)])).digest();
  }
  return r;
}

/** dstack compose hash: SHA-256 of the exact app-compose.json bytes, as 0x-prefixed bytes32. */
export function composeHashOf(appCompose: string | Uint8Array): `0x${string}` {
  return `0x${createHash("sha256").update(appCompose).digest("hex")}`;
}
