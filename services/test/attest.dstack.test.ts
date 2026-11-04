import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { bytesToHex, getAddress, hexToBytes, type Hex } from "viem";
import {
  acceptedTcbFrom,
  DcapUnavailableError,
  DevDcapVerifier,
  evaluateTdxTcb,
  PhalaCloudVerifier,
  quoteTcbInputs,
  type DcapVerifier,
} from "../src/attest/dcap.ts";
import { DEV_KEY_PROVIDER, devQuote } from "../src/attest/devAttestor.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { composeHashOf, DSTACK_RUNTIME_EVENT_TYPE, eventDigest, replayRtmr3, runtimeEvent, type DstackEvent } from "../src/attest/rtmr.ts";
import { OFFSETS } from "../src/attest/tdx.ts";
import { verifyRegistration, type Registration } from "../src/attest/verify.ts";

const REGISTRY = getAddress("0x2872ad3106951c0317df4d75a402025f94d8575e");
const APP_COMPOSE = readFileSync(new URL("../../harness-node/app-compose.json", import.meta.url), "utf8");
const X = composeHashOf(APP_COMPOSE); // the allowlisted harness
const EVIL_COMPOSE = APP_COMPOSE.replace("bollard-harness", "evil-harness");
const Y = composeHashOf(EVIL_COMPOSE); // what the malicious image really runs
const enclave = Enclave.generate();
const dev = new DevDcapVerifier(46630);
const acceptAll: DcapVerifier = { name: "accept", verify: async () => true };

const hex = (s: string) => Buffer.from(s, "utf8").toString("hex");
const kp = (name: string, id: string) => runtimeEvent("key-provider", Buffer.from(JSON.stringify({ name, id })));

/** The IMR-3 events dstack 0.5.x emits for a KMS app (dstack-util system_setup.rs), plus app events after boot. */
function dstackLog(compose: Hex, opts: { keyProvider?: DstackEvent; after?: DstackEvent[] } = {}): DstackEvent[] {
  const h = compose.slice(2);
  return [
    runtimeEvent("system-preparing"),
    runtimeEvent("app-id", "11".repeat(20)),
    runtimeEvent("compose-hash", h),
    runtimeEvent("instance-id", "22".repeat(20)),
    runtimeEvent("boot-mr-done"),
    runtimeEvent("mr-kms", "33".repeat(48)),
    runtimeEvent("os-image-hash", "44".repeat(32)),
    opts.keyProvider ?? kp("kms", "02" + "55".repeat(32)),
    runtimeEvent("storage-fs", hex("ext4")),
    runtimeEvent("system-ready"),
    ...(opts.after ?? []),
  ];
}

/**
 * A quote whose RTMR3 is the replay of `trueLog` (what the CVM really extended) and whose REPORTDATA carries
 * `reportCompose`. The registration then publishes `publishedLog`, which an attacker may have edited.
 */
function reg(trueLog: DstackEvent[], reportCompose: Hex, publishedLog: DstackEvent[] = trueLog, over: Partial<Registration> = {}): Registration {
  const base = hexToBytes(devQuote({ chainId: 46630, registry: REGISTRY, key: enclave.address, composeHash: reportCompose }).quote);
  base.set(replayRtmr3(trueLog), OFFSETS.rtmr3);
  return {
    quote: bytesToHex(base),
    eventLog: publishedLog,
    appCompose: APP_COMPOSE,
    composeHash: X,
    key: enclave.address,
    chainId: 46630,
    registry: REGISTRY,
    ...over,
  };
}

describe("dstack event digests (cc-eventlog/src/runtime_events.rs)", () => {
  test("V1 digest is SHA384(u32le(0x08000001) : name : payload), as dstack's v1_digest_unchanged test", () => {
    const e = { imr: 3, event_type: DSTACK_RUNTIME_EVENT_TYPE, event: "app-id", event_payload: "deadbeef" };
    const want = createHash("sha384")
      .update(Buffer.concat([Buffer.from([0x01, 0x00, 0x00, 0x08]), Buffer.from(":app-id:"), Buffer.from("deadbeef", "hex")]))
      .digest();
    expect(eventDigest(e)).toEqual(want);
  });

  test("V2 digest is SHA384 of the JCS JSON, as dstack's v2_digest_is_canonical_json_hash test", () => {
    const e = { imr: 3, event_type: DSTACK_RUNTIME_EVENT_TYPE, event: "compose-hash", event_payload: "abcd", version: 2 };
    const want = createHash("sha384").update('{"name":"compose-hash","payload":"abcd","type":134217729}').digest();
    expect(eventDigest(e)).toEqual(want);
  });

  test("the claimed digest is ignored and the event name is bound", () => {
    const a = runtimeEvent("compose-hash", "aa".repeat(32));
    expect(replayRtmr3([{ ...a, digest: "00".repeat(48) }])).toEqual(replayRtmr3([a]));
    expect(replayRtmr3([{ ...a, event: "app-event" }])).not.toEqual(replayRtmr3([a]));
  });

  test("an IMR-3 event that is not a dstack runtime event cannot be replayed", () => {
    expect(() => replayRtmr3([{ imr: 3, event_type: 4, event: "x", event_payload: "" }])).toThrow("not a dstack runtime event");
  });
});

describe("dstack-format registrations", () => {
  test("a correct dstack log (KMS key provider, app events after system-ready) passes", async () => {
    const log = dstackLog(X, { after: [runtimeEvent("bollard-started", hex("v1"))] });
    expect(await verifyRegistration(reg(log, X), acceptAll)).toMatchObject({ ok: true, reasons: [] });
  });

  test("V2 (canonical JSON) events verify too", async () => {
    const log = dstackLog(X).map((e) => runtimeEvent(e.event, e.event_payload, 2));
    expect(await verifyRegistration(reg(log, X), acceptAll)).toMatchObject({ ok: true });
  });

  test("the dev attestor's log follows the dstack format and passes the dev verifier", async () => {
    const q = devQuote({ chainId: 46630, registry: REGISTRY, key: enclave.address, composeHash: X });
    expect(q.eventLog.map((e) => e.event)).toEqual([
      "system-preparing",
      "app-id",
      "compose-hash",
      "instance-id",
      "boot-mr-done",
      "key-provider",
      "system-ready",
    ]);
    for (const e of q.eventLog) expect(e.digest).toBe(eventDigest(e).toString("hex"));
    const r: Registration = { ...q, appCompose: APP_COMPOSE, composeHash: X, key: enclave.address, chainId: 46630, registry: REGISTRY };
    expect(await verifyRegistration(r, dev)).toMatchObject({ ok: true });
  });

  test("label-swap attack from the review is rejected", async () => {
    // The malicious image (compose Y) boots normally, then the app emits an event whose payload is the
    // allowlisted hash X, and asks for REPORTDATA[32:64] = X.
    const trueLog = dstackLog(Y, { after: [runtimeEvent("app-event", X.slice(2))] });
    // It publishes the log with the two labels swapped, so a payload-only replay would still match.
    const swapped = trueLog.map((e) =>
      e.event === "compose-hash" ? { ...e, event: "app-event" } : e.event === "app-event" ? { ...e, event: "compose-hash" } : e,
    );
    const v = await verifyRegistration(reg(trueLog, X, swapped), acceptAll);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("RTMR3 replay mismatch");
    expect(v.reasons).toContain("boot segment does not start with system-preparing, app-id, compose-hash");
  });

  test("an app-emitted compose-hash event after system-ready is rejected even with the honest labels", async () => {
    const trueLog = dstackLog(Y, { after: [runtimeEvent("compose-hash", X.slice(2))] });
    const v = await verifyRegistration(reg(trueLog, X), acceptAll);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("expected exactly one compose-hash event");
    expect(v.reasons).toContain('event "compose-hash" after system-ready (app-emitted events may not reuse dstack boot event names)');
    expect(v.reasons).toContain("compose-hash event != SHA-256(app-compose)");
  });

  test("a compose-hash event after the boot marker is rejected", async () => {
    const log = dstackLog(X).filter((e) => e.event !== "compose-hash");
    log.push(runtimeEvent("compose-hash", X.slice(2)));
    const v = await verifyRegistration(reg(log, X), acceptAll);
    expect(v.ok).toBe(false);
    expect(v.reasons).toContain("boot segment does not start with system-preparing, app-id, compose-hash");
    expect(v.reasons).toContain("boot segment must contain exactly one compose-hash event (found 0)");
  });

  test("a log without system-ready is rejected", async () => {
    const log = dstackLog(X).filter((e) => e.event !== "system-ready");
    const v = await verifyRegistration(reg(log, X), acceptAll);
    expect(v.reasons).toContain("event log has no system-ready event (boot segment not closed)");
  });

  test("missing app-id or key-provider events are rejected", async () => {
    for (const drop of ["app-id", "key-provider", "instance-id", "boot-mr-done"]) {
      const log = dstackLog(X).filter((e) => e.event !== drop);
      const v = await verifyRegistration(reg(log, X), acceptAll);
      expect(v.reasons).toContain(`boot segment must contain exactly one ${drop} event (found 0)`);
    }
  });

  test("key-provider before boot-mr-done is rejected", async () => {
    const log = dstackLog(X);
    const k = log.findIndex((e) => e.event === "key-provider");
    const [kpe] = log.splice(k, 1);
    log.splice(3, 0, kpe!);
    const v = await verifyRegistration(reg(log, X), acceptAll);
    expect(v.reasons).toContain("boot-mr-done must come before key-provider in the boot segment");
  });

  test("the dev key provider passes only under the dev verifier on a dev chain", async () => {
    const log = dstackLog(X, { keyProvider: kp(DEV_KEY_PROVIDER, "00") });
    expect(await verifyRegistration(reg(log, X), dev)).toMatchObject({ ok: true });
    const v = await verifyRegistration(reg(log, X), acceptAll);
    expect(v.reasons).toContain("dev/unsafe key provider is accepted only by the dev verifier on a dev chain");
  });

  test('key provider "none" is rejected', async () => {
    const v = await verifyRegistration(reg(dstackLog(X, { keyProvider: kp("none", "") }), X), acceptAll);
    expect(v.reasons).toContain('key provider "none" is not accepted');
  });

  test("a malformed log is rejected without throwing", async () => {
    const r = reg(dstackLog(X), X);
    const v = await verifyRegistration({ ...r, eventLog: [{ imr: 3, event: "x" }] as unknown as DstackEvent[] }, acceptAll);
    expect(v.ok).toBe(false);
    expect(v.reasons[0]).toContain("malformed event log");
  });
});

/*
 * Real TDX v4 quote + Intel collateral from Phala-Network/dcap-qvl sample/ (MIT, commit 05c200b7). dcap-qvl's
 * tests assert this quote evaluates to UpToDate with no advisories.
 */
const FIX = new URL("./fixtures/dcap-qvl/", import.meta.url);
const QUOTE = new Uint8Array(readFileSync(new URL("tdx_quote", FIX)));
const COLLATERAL = JSON.parse(readFileSync(new URL("tdx_quote_collateral.json", FIX), "utf8")) as Record<string, string>;

type Tcb = { tcbLevels: { tcbStatus: string; advisoryIDs?: string[] }[] };
function collateral(edit: { platform?: (t: Tcb) => void; qe?: (t: Tcb) => void } = {}) {
  const t = JSON.parse(COLLATERAL.tcb_info!) as Tcb;
  const q = JSON.parse(COLLATERAL.qe_identity!) as Tcb;
  edit.platform?.(t);
  edit.qe?.(q);
  return { ...COLLATERAL, tcb_info: JSON.stringify(t), qe_identity: JSON.stringify(q) };
}
const phalaBody = (c: unknown, quote: Uint8Array = QUOTE) => ({
  success: true,
  quote: { verified: true },
  checksum: createHash("sha256").update(quote).digest("hex"),
  quote_collateral: c,
});
const respond = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const phala = (body: unknown, accept?: string) => new PhalaCloudVerifier("https://x", respond(body), acceptedTcbFrom(accept));

describe("Phala verifier TCB status", () => {
  test("the sample quote's inputs and status match dcap-qvl", () => {
    const i = quoteTcbInputs(QUOTE);
    expect(i.fmspc).toBe("B0C06F000000");
    expect(i.pceSvn).toBe(11);
    expect(i.qeIsvSvn).toBe(6);
    expect(Array.from(i.cpuSvn)).toEqual([3, 3, 2, 2, 4, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(evaluateTdxTcb(i, JSON.parse(COLLATERAL.tcb_info!), JSON.parse(COLLATERAL.qe_identity!))).toEqual({ status: "UpToDate", advisoryIds: [] });
  });

  test("UpToDate passes", async () => {
    expect(await phala(phalaBody(collateral())).check(QUOTE)).toEqual({ ok: true, tcbStatus: "UpToDate" });
  });

  test("SWHardeningNeeded passes by default; ConfigurationNeeded only when configured", async () => {
    const sw = collateral({ platform: (t) => (t.tcbLevels[0]!.tcbStatus = "SWHardeningNeeded") });
    expect(await phala(phalaBody(sw)).verify(QUOTE)).toBe(true);
    const cfg = collateral({ platform: (t) => (t.tcbLevels[0]!.tcbStatus = "ConfigurationNeeded") });
    expect(await phala(phalaBody(cfg)).check(QUOTE)).toMatchObject({ ok: false, tcbStatus: "ConfigurationNeeded" });
    expect(await phala(phalaBody(cfg), "UpToDate,ConfigurationNeeded").verify(QUOTE)).toBe(true);
    expect(() => acceptedTcbFrom("UpToDate,OutOfDate")).toThrow("cannot be accepted");
  });

  test("OutOfDate and Revoked platforms are rejected even though verified is true", async () => {
    const ood = collateral({
      platform: (t) => {
        t.tcbLevels[0]!.tcbStatus = "OutOfDate";
        t.tcbLevels[0]!.advisoryIDs = ["INTEL-SA-00001"];
      },
    });
    expect(await phala(phalaBody(ood)).check(QUOTE)).toEqual({
      ok: false,
      tcbStatus: "OutOfDate",
      detail: "TCB status OutOfDate (INTEL-SA-00001) is not accepted",
    });
    const rev = collateral({ platform: (t) => (t.tcbLevels[0]!.tcbStatus = "Revoked") });
    expect(await phala(phalaBody(rev)).verify(QUOTE)).toBe(false);
  });

  test("an out-of-date QE converges the status to OutOfDate", async () => {
    const c = collateral({ qe: (t) => (t.tcbLevels[0]!.tcbStatus = "OutOfDate") });
    expect(await phala(phalaBody(c)).check(QUOTE)).toMatchObject({ ok: false, tcbStatus: "OutOfDate" });
  });

  test("no matching TCB level or another platform's collateral is a rejection", async () => {
    const none = collateral({ platform: (t) => (t.tcbLevels = []) });
    expect(await phala(phalaBody(none)).check(QUOTE)).toMatchObject({ ok: false, detail: "TCB evaluation failed: no matching platform TCB level" });
    const other = { ...COLLATERAL, tcb_info: COLLATERAL.tcb_info!.replace("B0C06F000000", "90C06F000000") };
    expect(await phala(phalaBody(other)).check(QUOTE)).toMatchObject({ ok: false });
  });

  test("a quote without a PCK chain (the dev quote) is rejected, never passed", async () => {
    const q = hexToBytes(devQuote({ chainId: 46630, registry: REGISTRY, key: enclave.address, composeHash: X }).quote);
    expect(await phala(phalaBody(collateral(), q)).verify(q)).toBe(false);
  });

  test("missing or malformed collateral and a foreign checksum are unavailable, not a verdict", async () => {
    await expect(phala({ quote: { verified: true } }).verify(QUOTE)).rejects.toBeInstanceOf(DcapUnavailableError);
    await expect(phala(phalaBody({ ...COLLATERAL, tcb_info: "{" })).verify(QUOTE)).rejects.toBeInstanceOf(DcapUnavailableError);
    await expect(phala({ ...phalaBody(collateral()), checksum: "00".repeat(32) }).verify(QUOTE)).rejects.toBeInstanceOf(DcapUnavailableError);
    const notJson = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
    await expect(new PhalaCloudVerifier("https://x", notJson).verify(QUOTE)).rejects.toBeInstanceOf(DcapUnavailableError);
  });

  test("verifyRegistration reports the TCB reason", async () => {
    const ood = collateral({ platform: (t) => (t.tcbLevels[0]!.tcbStatus = "OutOfDate") });
    const v = await verifyRegistration(reg(dstackLog(X), X), phala(phalaBody(ood, hexToBytes(reg(dstackLog(X), X).quote as Hex))));
    expect(v.reasons.some((r) => r.startsWith("DCAP (phala) rejected the quote: TCB evaluation failed"))).toBe(true);
  });
});
