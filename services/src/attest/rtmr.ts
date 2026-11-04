import { createHash } from "node:crypto";

/**
 * dstack event log and RTMR3 replay (doc §4.2), matching Dstack-TEE/dstack:
 *   dstack/cc-eventlog/src/runtime_events.rs  (RuntimeEvent::preimage / digest / replay_events)
 *   dstack/cc-eventlog/src/tdx.rs             (TdxEvent, the JSON shape GetQuote returns in `event_log`)
 *
 * The guest agent's GetQuote returns `event_log` as a JSON array of TdxEvent:
 *   { imr, event_type, digest, event, event_payload, version?, preimage? }
 * `imr` is zero-based, byte fields are lowercase hex without 0x. It holds the firmware events for IMR 0-2
 * and the dstack runtime events for IMR 3. Every runtime event has event_type 0x08000001 and extends
 *   RTMR3_new = SHA384(RTMR3_old || digest)
 * where digest binds the event type and name, not just the payload:
 *   V1 (default):  SHA384(u32le(0x08000001) || ":" || name || ":" || payload)
 *   V2 (version 2, opt-in via app-compose event_log_version on dstack >= 0.6):
 *                  SHA384(JCS({"name":name,"payload":hex(payload),"type":134217729}))
 * The claimed `digest` and `preimage` fields are never trusted: the digest is recomputed from type, name
 * and payload, so relabelling an event changes RTMR3.
 */
export const DSTACK_RUNTIME_EVENT_TYPE = 0x08000001;

export interface DstackEvent {
  imr: number;
  event_type: number;
  event: string;
  event_payload: string; // hex, no 0x
  digest?: string; // informational only; replay recomputes it
  version?: number; // 2 = canonical JSON digest, absent or 1 = binary digest
  preimage?: string; // informational only
}

const HEX = /^(?:[0-9a-fA-F]{2})*$/;

/** The exact bytes dstack hashes for a runtime event. Throws on anything that is not a well-formed runtime event. */
export function eventPreimage(e: DstackEvent): Buffer {
  if (e.event_type !== DSTACK_RUNTIME_EVENT_TYPE) throw new Error(`not a dstack runtime event (event_type ${e.event_type})`);
  if (typeof e.event !== "string") throw new Error("event name is not a string");
  if (typeof e.event_payload !== "string" || !HEX.test(e.event_payload)) throw new Error(`event ${e.event}: payload is not hex`);
  const payload = Buffer.from(e.event_payload, "hex");
  const version = e.version ?? 1;
  if (version === 1) {
    const type = Buffer.alloc(4);
    type.writeUInt32LE(DSTACK_RUNTIME_EVENT_TYPE);
    return Buffer.concat([type, Buffer.from(":"), Buffer.from(e.event, "utf8"), Buffer.from(":"), payload]);
  }
  if (version === 2) {
    // RFC 8785 (JCS): keys sorted, no whitespace, strings escaped exactly as ECMAScript JSON.stringify does.
    const json = `{"name":${JSON.stringify(e.event)},"payload":"${payload.toString("hex")}","type":${DSTACK_RUNTIME_EVENT_TYPE}}`;
    return Buffer.from(json, "utf8");
  }
  throw new Error(`event ${e.event}: unknown event log version ${version}`);
}

export function eventDigest(e: DstackEvent): Buffer {
  return createHash("sha384").update(eventPreimage(e)).digest();
}

/** Replays RTMR3 from the IMR-3 events only. Throws if an IMR-3 event is not a well-formed dstack runtime event. */
export function replayRtmr3(events: readonly DstackEvent[]): Buffer {
  let r = Buffer.alloc(48);
  for (const e of events) {
    if (e.imr !== 3) continue;
    r = createHash("sha384").update(Buffer.concat([r, eventDigest(e)])).digest();
  }
  return r;
}

/** A dstack runtime event for IMR 3, with its digest filled in the way dstack reports it. */
export function runtimeEvent(event: string, payload: Uint8Array | string = "", version?: 2): DstackEvent {
  const event_payload = typeof payload === "string" ? payload : Buffer.from(payload).toString("hex");
  const e: DstackEvent = { imr: 3, event_type: DSTACK_RUNTIME_EVENT_TYPE, event, event_payload, ...(version ? { version } : {}) };
  return { ...e, digest: eventDigest(e).toString("hex") };
}

/** dstack compose hash: SHA-256 of the exact app-compose.json bytes, as 0x-prefixed bytes32. */
export function composeHashOf(appCompose: string | Uint8Array): `0x${string}` {
  return `0x${createHash("sha256").update(appCompose).digest("hex")}`;
}
