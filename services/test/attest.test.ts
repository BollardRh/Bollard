import { describe, expect, test } from "bun:test";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { bytesToHex, getAddress, hexToBytes, keccak256, toHex, type Hex } from "viem";
import { DevDcapVerifier, PhalaCloudVerifier, type DcapVerifier } from "../src/attest/dcap.ts";
import { DEV_OS_MEASUREMENT, devQuote, isDevQuote } from "../src/attest/devAttestor.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { composeHashOf, replayRtmr3 } from "../src/attest/rtmr.ts";
import { open, seal } from "../src/attest/sealedBox.ts";
import { keyBinding, osMeasurement, parseTdxV4 } from "../src/attest/tdx.ts";
import { verifyRegistration, type Registration } from "../src/attest/verify.ts";
import { loadCorpus } from "../src/corpus/loader.ts";
import { decryptHoldout, encryptHoldout } from "../src/corpus/holdout.ts";
import { HEADERS, signRequest, verifyRequest } from "../src/node/auth.ts";

const REGISTRY = getAddress("0x2872ad3106951c0317df4d75a402025f94d8575e");
const APP_COMPOSE = readFileSync(new URL("../../harness-node/app-compose.json", import.meta.url), "utf8");
const COMPOSE = composeHashOf(APP_COMPOSE);
const enclave = Enclave.generate();
const dev = new DevDcapVerifier(46630);

function registration(over: Partial<Registration> = {}): Registration {
  const { quote, eventLog } = devQuote({ chainId: 46630, registry: REGISTRY, key: enclave.address, composeHash: COMPOSE });
  return { quote, eventLog, appCompose: APP_COMPOSE, composeHash: COMPOSE, key: enclave.address, chainId: 46630, registry: REGISTRY, ...over };
}

describe("TDX quote fields (mirror of TdxQuote.sol)", () => {
  test("dev quote parses as TDX v4 with the dev OS measurement and the key binding", () => {
    const r = registration();
    const f = parseTdxV4(hexToBytes(r.quote as Hex));
    expect(f.version).toBe(4);
    expect(f.teeType).toBe(0x81);
    expect(osMeasurement(f)).toBe(DEV_OS_MEASUREMENT);
    expect(bytesToHex(f.reportData.slice(0, 32))).toBe(keyBinding(46630, REGISTRY, enclave.address));
    expect(bytesToHex(f.reportData.slice(32))).toBe(COMPOSE);
  });

  test("rejects short, non-v4 and non-TDX quotes", () => {
    const q = hexToBytes(registration().quote as Hex);
    expect(() => parseTdxV4(q.slice(0, 631))).toThrow("too short");
    const v5 = q.slice();
    v5[0] = 5;
    expect(() => parseTdxV4(v5)).toThrow("not a TDX v4");
    const sgx = q.slice();
    sgx[4] = 0;
    expect(() => parseTdxV4(sgx)).toThrow("not a TDX v4");
  });

  test("the dev attestor refuses mainnets", () => {
    for (const chainId of [1, 8453, 4663]) {
      expect(() => devQuote({ chainId, registry: REGISTRY, key: enclave.address, composeHash: COMPOSE })).toThrow("refused");
      expect(() => new DevDcapVerifier(chainId)).toThrow("refused");
    }
  });
});

describe("RTMR3 replay", () => {
  test("starts at 48 zero bytes and extends with SHA384(old || SHA384(payload))", () => {
    expect(replayRtmr3([])).toEqual(Buffer.alloc(48));
    const payload = "deadbeef";
    const d = createHash("sha384").update(Buffer.from(payload, "hex")).digest();
    const want = createHash("sha384").update(Buffer.concat([Buffer.alloc(48), d])).digest();
    expect(replayRtmr3([{ imr: 3, event: "x", event_payload: payload }, { imr: 1, event: "ignored", event_payload: "00" }])).toEqual(want);
  });
});

describe("watcher registration check (doc §4.2)", () => {
  test("an honest dev registration passes", async () => {
    expect(await verifyRegistration(registration(), dev, new Set([DEV_OS_MEASUREMENT.toLowerCase()]))).toEqual({
      ok: true,
      reasons: [],
      osMeasurement: DEV_OS_MEASUREMENT,
    });
  });

  test("a quote bound to another key fails", async () => {
    const v = await verifyRegistration(registration({ key: Enclave.generate().address }), dev);
    expect(v.reasons).toContain("REPORTDATA does not bind this key/chain/registry");
  });

  test("a different app-compose fails", async () => {
    const v = await verifyRegistration(registration({ appCompose: APP_COMPOSE.replace("bollard-harness", "evil-harness") }), dev);
    expect(v.reasons).toContain("compose-hash event != SHA-256(app-compose)");
  });

  test("an edited event log fails the RTMR3 replay", async () => {
    const r = registration();
    r.eventLog = [...r.eventLog, { imr: 3, event: "extra", event_payload: "00" }];
    expect((await verifyRegistration(r, dev)).reasons).toContain("RTMR3 replay mismatch");
  });

  test("a DCAP failure fails", async () => {
    const reject: DcapVerifier = { name: "reject", verify: async () => false };
    expect((await verifyRegistration(registration(), reject)).reasons).toContain("DCAP (reject) rejected the quote");
  });

  test("an OS outside the expected allowlist fails", async () => {
    const v = await verifyRegistration(registration(), dev, new Set([keccak256(toHex("real-os"))]));
    expect(v.reasons).toContain("OS measurement not on the expected allowlist");
  });
});

describe("DCAP verifiers", () => {
  test("the dev verifier only accepts dev quotes", async () => {
    const q = hexToBytes(registration().quote as Hex);
    expect(isDevQuote(q)).toBe(true);
    expect(await dev.verify(q)).toBe(true);
    const real = q.slice();
    real[200] = real[200]! ^ 0xff; // different MRTD
    expect(await dev.verify(real)).toBe(false);
  });

  test("the Phala verifier passes only on result.quote.verified === true", async () => {
    const calls: string[] = [];
    const fake = (body: unknown, status = 200) =>
      (async (_url: string | URL | Request, init?: RequestInit) => {
        calls.push(String(init?.body));
        return new Response(JSON.stringify(body), { status });
      }) as unknown as typeof fetch;
    const q = hexToBytes(registration().quote as Hex);
    expect(await new PhalaCloudVerifier("https://x", fake({ quote: { verified: true } })).verify(q)).toBe(true);
    expect(await new PhalaCloudVerifier("https://x", fake({ quote: { verified: false } })).verify(q)).toBe(false);
    expect(await new PhalaCloudVerifier("https://x", fake({}, 500)).verify(q)).toBe(false);
    expect(JSON.parse(calls[0]!).hex).toBe(bytesToHex(q).slice(2));
  });
});

describe("sealed holdout box", () => {
  test("only the recipient enclave can open it", () => {
    const blob = seal(enclave.publicKey, "holdout sessions");
    expect(enclave.open(blob).toString()).toBe("holdout sessions");
    expect(() => Enclave.generate().open(blob)).toThrow();
  });

  test("tampering is detected", () => {
    const blob = hexToBytes(seal(enclave.publicKey, "holdout sessions"));
    blob[blob.length - 1] = blob[blob.length - 1]! ^ 1;
    expect(() => enclave.open(bytesToHex(blob))).toThrow();
  });

  test("open() works with a raw private key", () => {
    const pk = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
    const e = Enclave.unsafeFromPrivateKey(pk);
    expect(open(pk, seal(e.publicKey, "x")).toString()).toBe("x");
  });
});

describe("signed node requests", () => {
  const deps = (active = true) => {
    const seen = new Set<string>();
    return {
      isActiveKey: async () => active,
      useNonce: async (_k: string, n: string) => (seen.has(n) ? false : (seen.add(n), true)),
    };
  };

  test("a signed request verifies once", async () => {
    const d = deps();
    const h = await signRequest(enclave, "POST", "/api/node/claim", "{}");
    expect(await verifyRequest(h, "POST", "/api/node/claim", "{}", d)).toEqual({ ok: true, key: enclave.address });
    expect(await verifyRequest(h, "POST", "/api/node/claim", "{}", d)).toMatchObject({ ok: false, reason: "nonce already used" });
  });

  test("a changed body, path or key is rejected", async () => {
    const h = await signRequest(enclave, "POST", "/api/node/claim", "{}");
    expect(await verifyRequest(h, "POST", "/api/node/claim", '{"x":1}', deps())).toMatchObject({ ok: false, status: 401 });
    expect(await verifyRequest(h, "POST", "/api/node/bundle", "{}", deps())).toMatchObject({ ok: false, status: 401 });
    const other = { ...h, [HEADERS.key]: Enclave.generate().address };
    expect(await verifyRequest(other, "POST", "/api/node/claim", "{}", deps())).toMatchObject({ reason: "signature does not match key" });
  });

  test("stale timestamps and inactive keys are rejected", async () => {
    const old = await signRequest(enclave, "POST", "/p", "", Date.now() - 120_000);
    expect(await verifyRequest(old, "POST", "/p", "", deps())).toMatchObject({ reason: "stale timestamp" });
    const h = await signRequest(enclave, "POST", "/p", "");
    expect(await verifyRequest(h, "POST", "/p", "", deps(false))).toMatchObject({ ok: false, status: 403 });
  });
});

describe("holdout bundle", () => {
  test("round-trips and recomputes the commitment", () => {
    const cases = loadCorpus().cases.slice(0, 3).map((c) => c.case);
    const key = randomBytes(32);
    const { blob, commit } = encryptHoldout(cases, key);
    const h = decryptHoldout(blob, key);
    expect(h.commit).toBe(commit);
    expect(h.cases.map((c) => c.id)).toEqual(cases.map((c) => c.id));
    expect(() => decryptHoldout(blob, randomBytes(32))).toThrow();
  });
});
