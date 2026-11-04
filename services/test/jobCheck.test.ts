import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getAddress, keccak256, parseEther, toHex, type Address, type Hex } from "viem";
import { cosign, leadRun, type HoldoutSet, type RunJob, type SignedBundle } from "../src/attest/cosign.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { loadCorpus } from "../src/corpus/loader.ts";
import { holdoutCommit, leafOf, merkleRoot } from "../src/corpus/merkle.ts";
import type { AttackCase } from "../src/corpus/schema.ts";
import { FunctionAgentClient } from "../src/harness/agentClient.ts";
import type { BatpRequest } from "../src/harness/batp.ts";
import { bundleHash, type RunBundle, type SealRecipient } from "../src/harness/bundle.ts";
import { hardened } from "../src/mock-agents/agents.ts";
import { JobRefused, openNodeChain, type NodeChain } from "../src/node/jobCheck.ts";
import { fakeChain, openRequest, type FakeChainState } from "./helpers/fakeChain.ts";
import { artifact, localChainReady, startAnvil, type LocalChain } from "./helpers/localchain.ts";

/**
 * Nodes do not trust the coordinator (security review): a lead refuses to run or seal, and a co-signer refuses
 * to sign, unless the job matches the node's own pinned view of the chain and its local corpus.
 */

const publicCases = loadCorpus().cases.map((c) => c.case);
const holdoutCases: AttackCase[] = ["enc-001", "cred-001"].map((id) => {
  const c = structuredClone(publicCases.find((x) => x.id === id)!);
  c.id = id.replace("-001", "-901");
  return c;
});
const salt = keccak256(toHex("holdout-salt"));
const holdout: HoldoutSet = { cases: holdoutCases, salt };
const corpusRoot = merkleRoot(publicCases.map(leafOf));
const commit = holdoutCommit(merkleRoot(holdoutCases.map(leafOf)), salt);
const NOW = 1_800_000_000_000;

const lead = Enclave.generate();
const coA = Enclave.generate();
const coB = Enclave.generate();
const sameAttesterAsLead = Enclave.generate();
const inactive = Enclave.generate();
const unregistered = Enclave.generate();
const attacker = Enclave.generate();

const att = (n: number) => getAddress(`0x${n.toString(16).padStart(40, "b")}`);
const ATT_LEAD = att(1);
const ATT_A = att(2);
const ATT_B = att(3);

const job: RunJob = {
  chainId: 46630,
  registry: "0x00000000000000000000000000000000b011A4D0",
  agentRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  agentId: 42n,
  versionHash: keccak256(toHex("agent-v1")),
  requestId: 7n,
  requestNextBlockHash: keccak256(toHex("block-101")),
  endpoint: "http://127.0.0.1:1/hardened",
  runToken: "t",
};

function state(): FakeChainState {
  return {
    chainId: 46630,
    ratingRegistry: job.registry,
    attesterRegistry: "0x00000000000000000000000000000000A7735700",
    corpusRoot,
    requests: new Map([
      [7n, openRequest({ agentRegistry: job.agentRegistry, agentId: job.agentId, versionHash: job.versionHash }, 100n)],
      [8n, { ...openRequest({ agentRegistry: job.agentRegistry, agentId: job.agentId, versionHash: job.versionHash }, 102n), status: 2 }],
    ]),
    blocks: new Map<bigint, Hex>([
      [100n, keccak256(toHex("block-100"))],
      [101n, job.requestNextBlockHash],
      [102n, keccak256(toHex("block-102"))],
      [103n, keccak256(toHex("block-103"))],
    ]),
    keys: new Map([
      [lead.address.toLowerCase(), { attester: ATT_LEAD, active: true }],
      [coA.address.toLowerCase(), { attester: ATT_A, active: true }],
      [coB.address.toLowerCase(), { attester: ATT_B, active: true }],
      [sameAttesterAsLead.address.toLowerCase(), { attester: ATT_LEAD, active: true }],
      [inactive.address.toLowerCase(), { attester: att(4), active: false }],
    ]),
  };
}
const chain = fakeChain(state());
const rec = (e: Enclave): SealRecipient => ({ address: e.address, publicKey: e.publicKey });

let agentCalls = 0;
const agent = new FunctionAgentClient((req: BatpRequest) => {
  agentCalls++;
  return hardened(req);
});

const runLead = (over: Partial<Parameters<typeof leadRun>[0]> = {}) =>
  leadRun({
    job,
    chain,
    publicCases,
    holdout,
    corpusRoot,
    holdoutCommit: commit,
    enclave: lead,
    quoteHash: keccak256(toHex("lead-quote")),
    cosigners: [rec(coA), rec(coB)],
    agent,
    now: NOW,
    ...over,
  });

let honest: SignedBundle;
beforeAll(async () => {
  honest = (await runLead()).signed;
}, 60_000);

describe("lead refuses jobs that do not match its own view of the chain", () => {
  const refuses = async (want: string, over: Partial<Parameters<typeof leadRun>[0]>) => {
    agentCalls = 0;
    const err = await runLead(over).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(JobRefused);
    expect((err as JobRefused).problems.join(" | ")).toContain(want);
    expect(agentCalls).toBe(0); // nothing was run, so nothing was sealed or signed
  };

  test("the honest job runs and seals to both co-signers", () => {
    expect(Object.keys(honest.bundle.holdout.sealed).sort()).toEqual([coA, coB].map((e) => e.address.toLowerCase()).sort());
  });

  test("wrong registry", () => refuses("is not the pinned RatingRegistry", { job: { ...job, registry: "0x000000000000000000000000000000000BAD0BAD" } }));
  test("wrong chain", () => refuses("is not the pinned chain 46630", { job: { ...job, chainId: 1 } }));
  test("subject mismatch: versionHash", () => refuses("subject versionHash does not match", { job: { ...job, versionHash: keccak256(toHex("other")) } }));
  test("subject mismatch: agentId", () => refuses("subject agentId does not match", { job: { ...job, agentId: 43n } }));
  test("subject mismatch: agentRegistry", () =>
    refuses("subject agentRegistry does not match", { job: { ...job, agentRegistry: "0x000000000000000000000000000000000BAD0BAD" } }));
  test("request that does not exist", () => refuses("does not exist on-chain", { job: { ...job, requestId: 99n } }));
  test("request that is no longer open", () =>
    refuses("is not open (status 2)", { job: { ...job, requestId: 8n, requestNextBlockHash: keccak256(toHex("block-103")) } }));
  test("ground block hash", () => refuses("requestNextBlockHash is not blockhash(requestBlock + 1)", { job: { ...job, requestNextBlockHash: keccak256(toHex("ground")) } }));
  test("a real block hash that is not the block after the request", () =>
    refuses("requestNextBlockHash is not blockhash(requestBlock + 1)", { job: { ...job, requestNextBlockHash: keccak256(toHex("block-102")) } }));
  test("wrong corpus root", () => refuses("is not the local corpus root", { corpusRoot: keccak256(toHex("other-corpus")) }));

  test("fake co-signer public key (holdout would be sealed to the attacker)", () =>
    refuses("public key does not belong to the address", { cosigners: [{ address: coA.address, publicKey: attacker.publicKey }, rec(coB)] }));
  test("malformed co-signer public key", () => refuses("public key does not belong to the address", { cosigners: [{ address: coA.address, publicKey: "0x04" }] }));
  test("co-signer from the lead's own attester", () => refuses("same attester as the lead", { cosigners: [rec(coA), rec(sameAttesterAsLead)] }));
  test("co-signer that is the lead itself", () => refuses("is this node's own key", { cosigners: [rec(coA), rec(lead)] }));
  test("inactive co-signer key", () => refuses("enclave key is not active", { cosigners: [rec(coA), rec(inactive)] }));
  test("unregistered co-signer key", () => refuses("has no attester on-chain", { cosigners: [rec(coA), rec(unregistered)] }));
  test("two co-signers from one attester", async () => {
    const s = state();
    const coA2 = Enclave.generate();
    s.keys.set(coA2.address.toLowerCase(), { attester: ATT_A, active: true });
    await refuses("already has a co-signer on this job", { chain: fakeChain(s), cosigners: [rec(coA), rec(coA2)] });
  });
  test("the lead's own key is not registered", async () => {
    const s = state();
    s.keys.delete(lead.address.toLowerCase());
    await refuses("this node's enclave key has no attester on-chain", { chain: fakeChain(s) });
  });
});

describe("co-signer refuses bundles that do not match its own view of the chain", () => {
  const cosignAs = (over: Partial<Parameters<typeof cosign>[0]> = {}) =>
    cosign({ job: { ...job, runToken: "" }, signed: honest, publicCases, holdout, me: coA, chain, now: NOW + 60_000, ...over });
  const refuses = async (want: string, over: Partial<Parameters<typeof cosign>[0]>) => {
    const r = await cosignAs(over);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(" | ")).toContain(want);
  };
  /** A colluding lead edits the bundle and re-signs it with its real, active key. */
  const resign = async (edit: (b: RunBundle) => void): Promise<SignedBundle> => {
    const bundle = structuredClone(honest.bundle);
    edit(bundle);
    const h = bundleHash(bundle);
    return { bundle, bundleHash: h, leadSig: await lead.signMessage({ raw: h }) };
  };

  test("the honest bundle is signed", async () => {
    expect(await cosignAs()).toMatchObject({ ok: true });
  });

  test("wrong registry (bundle and job agree, both off the pinned one)", async () => {
    const registry = getAddress("0x000000000000000000000000000000000bad0bad");
    const signed = await resign((b) => {
      b.report.registry = registry;
    });
    await refuses("is not the pinned RatingRegistry", { signed, job: { ...job, registry } });
  });
  test("wrong chain", async () => {
    const signed = await resign((b) => {
      b.report.chainId = 1;
    });
    await refuses("is not the pinned chain", { signed, job: { ...job, chainId: 1 } });
  });
  test("subject mismatch with the on-chain request", async () => {
    const versionHash = keccak256(toHex("other"));
    const signed = await resign((b) => {
      b.report.versionHash = versionHash;
    });
    await refuses("subject versionHash does not match the on-chain request", { signed, job: { ...job, versionHash } });
  });
  test("job that does not match the bundle", () => refuses("bundle report does not match the job", { job: { ...job, requestId: 8n } }));
  test("wrong block hash", () => refuses("requestNextBlockHash is not blockhash(requestBlock + 1)", { job: { ...job, requestNextBlockHash: keccak256(toHex("ground")) } }));
  test("wrong seedKey (lead ground its own seed)", async () => {
    const signed = await resign((b) => {
      b.seedKey = keccak256(toHex("ground-seed"));
    });
    await refuses("seedKey is not derived from the request block hash", { signed });
  });
  test("wrong corpus root (co-signer's local corpus differs)", async () => {
    const s = state();
    s.corpusRoot = keccak256(toHex("other-corpus"));
    await refuses("is not the local corpus root", { chain: fakeChain(s) });
  });
  test("lead key from the co-signer's own attester", async () => {
    const s = state();
    s.keys.set(lead.address.toLowerCase(), { attester: ATT_A, active: true });
    await refuses("lead key belongs to this node's attester", { chain: fakeChain(s) });
  });
  test("lead key with no attester", async () => {
    const s = state();
    s.keys.delete(lead.address.toLowerCase());
    await refuses("lead enclave key is not active", { chain: fakeChain(s) });
    await refuses("lead enclave key has no attester on-chain", { chain: fakeChain(s) });
  });
  test("inactive lead key", async () => {
    const s = state();
    s.keys.set(lead.address.toLowerCase(), { attester: ATT_LEAD, active: false });
    await refuses("lead enclave key is not active", { chain: fakeChain(s) });
  });
  test("request no longer open", async () => {
    const s = state();
    s.requests.get(7n)!.status = 2;
    await refuses("is not open (status 2)", { chain: fakeChain(s) });
  });
});

// ------------------------------------------------------------------------------- RPC view on a local chain

const maybe = localChainReady() ? describe : describe.skip;
maybe("openNodeChain on anvil", () => {
  let lc: LocalChain;
  let registry: Address, attesters: Address, identity: Address;
  let requestBlock: bigint;
  const versionHash = keccak256(toHex("agent-v1"));

  beforeAll(async () => {
    lc = await startAnvil();
    const A = {
      erc20: artifact("Mocks.sol", "MockERC20"),
      identity: artifact("Mocks.sol", "MockIdentity8004"),
      reputation: artifact("Mocks.sol", "MockReputation8004"),
      attesters: artifact("AttesterRegistry.sol", "AttesterRegistry"),
      feeRouter: artifact("FeeRouter.sol", "FeeRouter"),
      registry: artifact("RatingRegistry.sol", "RatingRegistry"),
    };
    const gov = lc.wallet(0);
    const g = gov.account!.address;
    const usdg = await lc.deploy(gov, A.erc20, ["Test USDG", "tUSDG", 6]);
    const blrd = await lc.deploy(gov, A.erc20, ["Test BLRD", "tBLRD", 18]);
    identity = await lc.deploy(gov, A.identity, []);
    const reputation = await lc.deploy(gov, A.reputation, []);
    attesters = await lc.deploy(gov, A.attesters, [blrd, g, g, parseEther("1000"), 10n * 86_400n, 1n, parseEther("100")]);
    const feeRouter = await lc.deploy(gov, A.feeRouter, [g, g, g, g, g, usdg, 99_000_000n]);
    const params = {
      quorum: 2, minSeeds: 8, scoreTolerance: 10, criticalMask: 0xb7, requiredTestedMask: 0xff,
      maxTtl: 30n * 86_400n, maxReportAge: 86_400n, disputeWindow: 72n * 3600n, tiebreakWindow: 72n * 3600n,
      requestTtl: 14n * 86_400n, runFee: 300_000_000n, disputeSlashAmount: parseEther("1000"),
    };
    registry = await lc.deploy(gov, A.registry, [attesters, feeRouter, usdg, g, g, identity, reputation, params]);
    const owner = lc.wallet(4);
    await lc.send(gov, identity, A.identity.abi, "register", [owner.account!.address, owner.account!.address]);
    await lc.send(gov, usdg, A.erc20.abi, "mint", [owner.account!.address, 1_000_000_000n]);
    await lc.send(owner, usdg, A.erc20.abi, "approve", [registry, 1_000_000_000n]);
    const r = await lc.send(owner, registry, A.registry.abi, "requestRun", [identity, 1n, versionHash, `0x${"00".repeat(32)}`]);
    requestBlock = r.blockNumber;
    await lc.mine(3);
  }, 60_000);

  afterAll(() => lc?.stop());

  const open = (over: Partial<Parameters<typeof openNodeChain>[0]> = {}) =>
    openNodeChain({ rpcUrl: lc.rpc, chainId: 31337, ratingRegistry: registry, attesterRegistry: attesters, corpusRoot, ...over });

  test("refuses to start on another chain or with a registry pair that does not match", async () => {
    expect(String(await open({ chainId: 46630 }).catch((e) => e))).toContain("not the configured CHAIN_ID 46630");
    expect(String(await open({ attesterRegistry: identity }).catch((e) => e))).toContain("not the configured");
  });

  test("reads the request and proves the request block from the event log", async () => {
    const c: NodeChain = await open();
    expect(await c.request(1n)).toEqual({ agentRegistry: getAddress(identity), agentId: 1n, versionHash, status: 1 });
    expect((await c.request(2n)).agentRegistry).toBe("0x0000000000000000000000000000000000000000");
    const next = (await c.blockHash(requestBlock + 1n))!;
    expect(await c.requestBlock(1n, next)).toBe(requestBlock);
    // the request block itself, a later block, an unknown hash, and another request id all fail
    expect(await c.requestBlock(1n, (await c.blockHash(requestBlock))!)).toBeNull();
    expect(await c.requestBlock(1n, (await c.blockHash(requestBlock + 2n))!)).toBeNull();
    expect(await c.requestBlock(1n, keccak256(toHex("ground")))).toBeNull();
    expect(await c.requestBlock(2n, next)).toBeNull();
    expect(await c.blockHash(10_000n)).toBeNull();
  });
});
