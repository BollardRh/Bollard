import { hexToBytes, type Address, type Hex } from "viem";
import { DevDcapVerifier, type DcapVerifier } from "./dcap.ts";
import { DEV_CHAINS, DEV_KEY_PROVIDER } from "./devAttestor.ts";
import { composeHashOf, DSTACK_RUNTIME_EVENT_TYPE, replayRtmr3, type DstackEvent } from "./rtmr.ts";
import { keyBinding, osMeasurement, parseTdxV4 } from "./tdx.ts";

/**
 * Watcher check for every EnclaveKeyRegistered event (doc §4.2 step 5). Any bonded attester runs it; the
 * keeper runs it for everyone. A failure means: call challengeKey(key) inside the window (or proveBadQuote
 * when an on-chain DCAP verifier is configured and the signature is bad).
 *
 * Checks, all of which must pass:
 *   1. DCAP: the quote's signature chain and TCB status verify
 *   2. RTMR3 replayed from the published event log equals the quote's RTMR3. Each event digest is
 *      recomputed the dstack way (type, name and payload), so event labels are bound to RTMR3.
 *   3. the boot segment is well formed (see checkBootSegment) and its single compose-hash event equals
 *      SHA-256(app-compose.json) and the claimed compose hash
 *   4. REPORTDATA binds this key to this chain and registry, and carries the same compose hash
 *   5. the key provider is a real one (KMS or local SGX); the dev marker passes only under the dev verifier
 *      on a dev chain
 *   6. optional: the OS measurement is on the allowlist the watcher expects
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

/**
 * Names dstack's own system setup emits into RTMR3 (dstack/dstack-util/src/system_setup.rs, v0.5.x and
 * v0.6.x). The boot segment ends at the first `system-ready`; on dstack 0.5.x anything after it may come
 * from the app through the guest agent's EmitEvent, so none of these names may appear there.
 */
const SYSTEM_EVENTS = new Set([
  "system-preparing",
  "app-id",
  "compose-hash",
  "init-script-hash",
  "gpu-policy-hash",
  "instance-id",
  "boot-mr-done",
  "mr-kms",
  "os-image-hash",
  "gpu-attestation",
  "key-provider",
  "storage-fs",
  "storage-encrypted",
  "system-ready",
]);

/** Key providers a production watcher accepts (dstack KeyProviderInfo names). "none" and "tpm" are refused. */
const REAL_KEY_PROVIDERS = new Set(["kms", "local-sgx"]);

function wellFormed(log: unknown): log is DstackEvent[] {
  if (!Array.isArray(log)) return false;
  return log.every(
    (e) =>
      e !== null &&
      typeof e === "object" &&
      Number.isInteger((e as DstackEvent).imr) &&
      typeof (e as DstackEvent).event === "string" &&
      typeof (e as DstackEvent).event_payload === "string" &&
      ((e as DstackEvent).imr !== 3 || (e as DstackEvent).event_type === DSTACK_RUNTIME_EVENT_TYPE),
  );
}

interface BootFacts {
  composePayload?: string;
  keyProvider?: { name: string; id: string };
}

/**
 * The IMR-3 boot segment as dstack-util emits it, up to and including the first system-ready:
 *   system-preparing, app-id, compose-hash, [init-script-hash...], [gpu-policy-hash], instance-id,
 *   boot-mr-done, [mr-kms], [os-image-hash], [gpu-attestation], key-provider, [storage-fs],
 *   [storage-encrypted], system-ready
 * Required here: the first three in that order, exactly one each of app-id / compose-hash / instance-id /
 * boot-mr-done / key-provider inside the segment, compose-hash before instance-id before boot-mr-done before
 * key-provider, exactly one compose-hash in the whole log, and no system event name after system-ready.
 */
function checkBootSegment(rt: DstackEvent[], reasons: string[]): BootFacts {
  const end = rt.findIndex((e) => e.event === "system-ready");
  if (end < 0) {
    reasons.push("event log has no system-ready event (boot segment not closed)");
    return {};
  }
  const boot = rt.slice(0, end + 1);
  const app = rt.slice(end + 1);
  const names = boot.map((e) => e.event);
  if (names[0] !== "system-preparing" || names[1] !== "app-id" || names[2] !== "compose-hash") {
    reasons.push("boot segment does not start with system-preparing, app-id, compose-hash");
  }
  const idx: Record<string, number> = {};
  for (const n of ["app-id", "compose-hash", "instance-id", "boot-mr-done", "key-provider"]) {
    const count = names.filter((x) => x === n).length;
    if (count !== 1) reasons.push(`boot segment must contain exactly one ${n} event (found ${count})`);
    idx[n] = names.indexOf(n);
  }
  const order = ["compose-hash", "instance-id", "boot-mr-done", "key-provider"];
  for (let i = 1; i < order.length; i++) {
    const a = idx[order[i - 1]!]!;
    const b = idx[order[i]!]!;
    if (a >= 0 && b >= 0 && a > b) reasons.push(`${order[i - 1]} must come before ${order[i]} in the boot segment`);
  }
  const composeTotal = rt.filter((e) => e.event === "compose-hash").length;
  if (composeTotal !== 1) reasons.push("expected exactly one compose-hash event");
  for (const e of app) {
    if (SYSTEM_EVENTS.has(e.event)) reasons.push(`event "${e.event}" after system-ready (app-emitted events may not reuse dstack boot event names)`);
  }

  const appId = idx["app-id"]! >= 0 ? boot[idx["app-id"]!]! : undefined;
  if (appId && appId.event_payload.length !== 40) reasons.push("app-id event payload is not 20 bytes");

  const facts: BootFacts = {};
  const compose = idx["compose-hash"]! >= 0 ? boot[idx["compose-hash"]!] : undefined;
  if (compose) facts.composePayload = compose.event_payload.toLowerCase();
  const kp = idx["key-provider"]! >= 0 ? boot[idx["key-provider"]!] : undefined;
  if (kp) {
    try {
      const j = JSON.parse(Buffer.from(kp.event_payload, "hex").toString("utf8")) as { name?: unknown; id?: unknown };
      if (typeof j.name !== "string" || typeof j.id !== "string") throw new Error();
      facts.keyProvider = { name: j.name, id: j.id };
    } catch {
      reasons.push("key-provider event payload is not dstack KeyProviderInfo JSON");
    }
  }
  return facts;
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

  const d = dcap.check ? await dcap.check(q) : { ok: await dcap.verify(q) };
  if (!d.ok) reasons.push(`DCAP (${dcap.name}) rejected the quote${d.detail ? `: ${d.detail}` : ""}`);

  const fromCompose = composeHashOf(r.appCompose);
  if (fromCompose !== r.composeHash.toLowerCase()) reasons.push("claimed compose hash != SHA-256(app-compose)");

  if (!wellFormed(r.eventLog)) {
    reasons.push("malformed event log (IMR-3 events must be dstack runtime events with hex payloads)");
  } else {
    let replayed: Buffer | undefined;
    try {
      replayed = replayRtmr3(r.eventLog);
    } catch (e) {
      reasons.push(`malformed event log: ${(e as Error).message}`);
    }
    if (replayed && !replayed.equals(Buffer.from(f.rtmr3))) reasons.push("RTMR3 replay mismatch");

    const facts = checkBootSegment(
      r.eventLog.filter((e) => e.imr === 3),
      reasons,
    );
    if (facts.composePayload !== undefined && `0x${facts.composePayload}` !== fromCompose) {
      reasons.push("compose-hash event != SHA-256(app-compose)");
    }
    if (facts.keyProvider) {
      const devOk = dcap instanceof DevDcapVerifier && DEV_CHAINS.has(r.chainId);
      const { name, id } = facts.keyProvider;
      if (name === DEV_KEY_PROVIDER) {
        if (!devOk) reasons.push("dev/unsafe key provider is accepted only by the dev verifier on a dev chain");
      } else if (!REAL_KEY_PROVIDERS.has(name)) {
        reasons.push(`key provider "${name}" is not accepted`);
      } else if (!/^[0-9a-fA-F]+$/.test(id)) {
        reasons.push(`key provider "${name}" has no id`);
      }
    }
  }

  const lo = `0x${Buffer.from(f.reportData.slice(0, 32)).toString("hex")}`;
  const hi = `0x${Buffer.from(f.reportData.slice(32, 64)).toString("hex")}`;
  if (lo !== keyBinding(r.chainId, r.registry, r.key).toLowerCase()) reasons.push("REPORTDATA does not bind this key/chain/registry");
  if (hi !== r.composeHash.toLowerCase()) reasons.push("REPORTDATA compose hash mismatch");

  if (allowedOs && !allowedOs.has(os.toLowerCase())) reasons.push("OS measurement not on the expected allowlist");

  return { ok: reasons.length === 0, reasons, osMeasurement: os };
}
