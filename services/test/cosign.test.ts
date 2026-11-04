import { beforeAll, describe, expect, test } from "bun:test";
import { getAddress, keccak256, recoverAddress, toHex, type Address, type Hex } from "viem";
import { cosign, leadRun, signReport, type HoldoutSet, type RunJob, type SignedBundle } from "../src/attest/cosign.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { loadCorpus } from "../src/corpus/loader.ts";
import { holdoutCommit, leafOf, merkleRoot } from "../src/corpus/merkle.ts";
import type { AttackCase } from "../src/corpus/schema.ts";
import { FunctionAgentClient } from "../src/harness/agentClient.ts";
import { bundleHash, type RunBundle } from "../src/harness/bundle.ts";
import { hardened, naive } from "../src/mock-agents/agents.ts";
import { fakeChain, openRequest, type FakeChainState } from "./helpers/fakeChain.ts";

/**
 * M4 done-when: a tampered transcript, receipt or score makes the co-signer refuse. Also covers the holdout
 * sealing, the lead-key checks and report freshness.
 */

const publicCases = loadCorpus().cases.map((c) => c.case);

// three holdout cases derived from public ones under new ids (holdout ids never collide with public ones)
const holdoutCases: AttackCase[] = ["enc-001", "mem-001", "cred-001"].map((id) => {
  const c = structuredClone(publicCases.find((x) => x.id === id)!);
  c.id = id.replace("-001", "-901");
  c.title = `${c.title} (holdout variant)`;
  return c;
});
const salt = keccak256(toHex("holdout-salt"));
const holdout: HoldoutSet = { cases: holdoutCases, salt };
const corpusRoot = merkleRoot(publicCases.map(leafOf));
const commit = holdoutCommit(merkleRoot(holdoutCases.map(leafOf)), salt);

const lead = Enclave.generate();
const coA = Enclave.generate();
const coB = Enclave.generate();
const outsider = Enclave.generate();
const NOW = 1_800_000_000_000;

const job: RunJob = {
  chainId: 46630,
  registry: "0x00000000000000000000000000000000b011A4D0",
  agentRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  agentId: 42n,
  versionHash: keccak256(toHex("agent-v1")),
  requestId: 7n,
  requestNextBlockHash: keccak256(toHex("block")),
  endpoint: "http://127.0.0.1:1/hardened",
  runToken: "t",
};

// the node's own view of the chain: the request at block 100, its next block, and one attester per enclave key
const attesterAddr = (n: number) => getAddress(`0x${n.toString(16).padStart(40, "a")}`);
const state: FakeChainState = {
  chainId: job.chainId,
  ratingRegistry: job.registry,
  attesterRegistry: "0x00000000000000000000000000000000A7735700",
  corpusRoot,
  requests: new Map([[job.requestId, openRequest({ agentRegistry: job.agentRegistry, agentId: job.agentId, versionHash: job.versionHash }, 100n)]]),
  blocks: new Map([[101n, job.requestNextBlockHash]]),
  keys: new Map([lead, coA, coB].map((e, i) => [e.address.toLowerCase(), { attester: attesterAddr(i + 1), active: true }])),
};
const chain = fakeChain(state);

let honest: SignedBundle;
let leadReport: { digest: Hex; signature: Hex };

beforeAll(async () => {
  const out = await leadRun({
    job,
    chain,
    publicCases,
    holdout,
    corpusRoot,
    holdoutCommit: commit,
    enclave: lead,
    quoteHash: keccak256(toHex("lead-quote")),
    cosigners: [coA, coB].map((e) => ({ address: e.address, publicKey: e.publicKey })),
    agent: new FunctionAgentClient(hardened),
    now: NOW,
  });
  honest = out.signed;
  leadReport = out.report;
}, 60_000);

const cosignAs = (me: Enclave, signed: SignedBundle, over: Partial<Parameters<typeof cosign>[0]> = {}) =>
  cosign({ job, signed, publicCases, holdout, me, chain, now: NOW + 60_000, ...over });

/** A malicious lead edits the bundle and re-signs it, so only the replay can catch the edit. */
async function resign(edit: (b: RunBundle) => void | Promise<void>): Promise<SignedBundle> {
  const bundle = structuredClone(honest.bundle);
  await edit(bundle);
  const h = bundleHash(bundle);
  return { bundle, bundleHash: h, leadSig: await lead.signMessage({ raw: h }) };
}

describe("lead run", () => {
  test("covers public and holdout cases, seals the holdout per co-signer", () => {
    const b = honest.bundle;
    expect(b.sessions.length).toBe(publicCases.length * 8);
    expect(b.sessions.every((s) => !s.receipt.holdout)).toBe(true);
    expect(b.holdout.results.length).toBe(holdoutCases.length * 8);
    expect(Object.keys(b.holdout.sealed).sort()).toEqual([coA, coB].map((e) => e.address.toLowerCase()).sort());
    expect(JSON.stringify(b)).not.toContain("enc-901"); // holdout case ids never appear in the public part
    expect(b.grade).toBe(5);
  });
});

describe("co-sign (doc §5.7)", () => {
  test("two co-signers sign the identical report the lead signed", async () => {
    const a = await cosignAs(coA, honest);
    const b = await cosignAs(coB, honest);
    expect(a).toMatchObject({ ok: true, digest: leadReport.digest });
    expect(b).toMatchObject({ ok: true, digest: leadReport.digest });
    if (!a.ok || !b.ok) throw new Error("unreachable");
    expect(await recoverAddress({ hash: a.digest, signature: a.signature })).toBe(coA.address);
    expect(await recoverAddress({ hash: b.digest, signature: b.signature })).toBe(coB.address);
    expect(await recoverAddress({ hash: leadReport.digest, signature: leadReport.signature })).toBe(lead.address);
  });

  const refuses = async (signed: SignedBundle, want: string, me = coA, over = {}) => {
    const r = await cosignAs(me, signed, over);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(" | ")).toContain(want);
  };

  // ------------------------------------------------------------------ tampering (M4 done-when)
  test("tampered transcript", async () =>
    refuses(
      await resign((b) => {
        b.sessions[0]!.transcript[0]!.reply = "edited";
      }),
      "transcript hash mismatch",
    ));

  test("tampered receipt", async () =>
    refuses(
      await resign((b) => {
        b.sessions[0]!.receipt.losses = ["transfer_to_untrusted"];
        b.sessions[0]!.receipt.outcome = "loss";
      }),
      "losses mismatch",
    ));

  test("tampered score", async () =>
    refuses(
      await resign((b) => {
        b.score = 99;
      }),
      "score mismatch",
    ));

  test("tampered grade", async () =>
    refuses(
      await resign((b) => {
        b.grade = 4;
      }),
      "grade mismatch",
    ));

  test("tampered holdout result (public summary)", async () =>
    refuses(
      await resign((b) => {
        b.holdout.results[0]!.losses = ["secret_leak"];
      }),
      "holdout results do not match the sealed sessions",
    ));

  test("tampered sealed holdout sessions", async () => {
    // the lead hides naive behaviour inside the sealed holdout and claims clean results
    const naiveRun = await leadRun({
      job,
      chain,
      publicCases,
      holdout,
      corpusRoot,
      holdoutCommit: commit,
      enclave: lead,
      quoteHash: keccak256(toHex("lead-quote")),
      cosigners: [coA].map((e) => ({ address: e.address, publicKey: e.publicKey })),
      agent: new FunctionAgentClient((req) => (req.caseId.endsWith("-901") ? naive(req) : hardened(req))),
      now: NOW,
    });
    const forged = structuredClone(naiveRun.signed.bundle);
    forged.holdout.results = honest.bundle.holdout.results; // claim the clean results
    forged.runsRoot = honest.bundle.runsRoot;
    forged.score = honest.bundle.score;
    forged.grade = honest.bundle.grade;
    forged.failedMask = honest.bundle.failedMask;
    const h = bundleHash(forged);
    await refuses({ bundle: forged, bundleHash: h, leadSig: await lead.signMessage({ raw: h }) }, "holdout results do not match");
  });

  test("an edit without re-signing", async () => {
    const bundle = structuredClone(honest.bundle);
    bundle.score = 99;
    await refuses({ ...honest, bundle }, "bundle hash mismatch");
  });

  // ------------------------------------------------------------------ lead key checks
  test("a lead signature from another key", async () => {
    const leadSig = await outsider.signMessage({ raw: honest.bundleHash });
    await refuses({ ...honest, leadSig }, "lead signature does not match leadKey");
  });

  test("an inactive lead key", async () => {
    await refuses(honest, "lead enclave key is not active", coA, { chain: { ...chain, isActiveKey: async (k: Address) => getAddress(k) !== lead.address } });
  });

  test("co-signing your own bundle", async () => {
    const own = await resign(() => {});
    await refuses(own, "lead and co-signer are the same key", lead);
  });

  // ------------------------------------------------------------------ holdout material
  test("a co-signer the holdout was not sealed to", async () => {
    state.keys.set(outsider.address.toLowerCase(), { attester: attesterAddr(9), active: true });
    await refuses(honest, "no holdout sealed to this co-signer", outsider);
  });

  test("a holdout set that does not match the published commitment", async () => {
    await refuses(honest, "holdout set does not match holdoutCommit", coA, { holdout: { cases: holdoutCases, salt: keccak256(toHex("other-salt")) } });
  });

  // ------------------------------------------------------------------ freshness
  test("a report older than maxReportAge", async () => {
    await refuses(honest, "report too old", coA, { now: NOW + 2 * 86_400_000 });
  });

  test("the lead's own report signature matches signReport", async () => {
    expect(await signReport(honest.bundle, lead)).toEqual(leadReport);
  });
});
