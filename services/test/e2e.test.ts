import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  parseEther,
  toHex,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { cosign, leadRun } from "../src/attest/cosign.ts";
import { DevDcapVerifier } from "../src/attest/dcap.ts";
import { DEV_OS_MEASUREMENT, devQuote } from "../src/attest/devAttestor.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { composeHashOf } from "../src/attest/rtmr.ts";
import { verifyRegistration } from "../src/attest/verify.ts";
import { reportOf } from "../src/harness/bundle.ts";
import { loadCorpus } from "../src/corpus/loader.ts";
import { holdoutCommit, leafOf, merkleRoot } from "../src/corpus/merkle.ts";
import { FunctionAgentClient } from "../src/harness/agentClient.ts";
import { hardened } from "../src/mock-agents/agents.ts";

/**
 * End to end on a local chain with the real compiled contracts:
 * dev-attested enclave keys register -> watcher check -> request -> lead run -> co-sign -> postRating ->
 * check() OK. Needs `anvil` on PATH and `forge build` output in contracts/out; skipped otherwise.
 */

const OUT = new URL("../../contracts/out/", import.meta.url).pathname;
const ready = Boolean(Bun.which("anvil")) && existsSync(`${OUT}RatingRegistry.sol/RatingRegistry.json`);
const maybe = ready ? describe : describe.skip;

const artifact = (file: string, name: string) => {
  const j = JSON.parse(readFileSync(`${OUT}${file}/${name}.json`, "utf8")) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: j.abi, bytecode: j.bytecode.object };
};

// anvil's default dev accounts (public test keys)
const KEYS: Hex[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
];

maybe("end to end on anvil", () => {
  const PORT = 18545 + Math.floor(Math.random() * 1000);
  const rpc = `http://127.0.0.1:${PORT}`;
  let anvil: ChildProcess;
  const pub = createPublicClient({ chain: foundry, transport: http(rpc), pollingInterval: 50 });
  const wallet = (i: number) =>
    createWalletClient({ chain: foundry, transport: http(rpc), account: privateKeyToAccount(KEYS[i]!), pollingInterval: 50 });
  const gov = wallet(0);
  const owner = wallet(4);

  const A = {
    erc20: artifact("Mocks.sol", "MockERC20"),
    identity: artifact("Mocks.sol", "MockIdentity8004"),
    reputation: artifact("Mocks.sol", "MockReputation8004"),
    attesters: artifact("AttesterRegistry.sol", "AttesterRegistry"),
    feeRouter: artifact("FeeRouter.sol", "FeeRouter"),
    registry: artifact("RatingRegistry.sol", "RatingRegistry"),
  };

  async function deploy(a: { abi: Abi; bytecode: Hex }, args: unknown[]): Promise<Address> {
    const hash = await gov.deployContract({ abi: a.abi, bytecode: a.bytecode, args });
    return (await pub.waitForTransactionReceipt({ hash })).contractAddress!;
  }
  async function send(w: ReturnType<typeof wallet>, address: Address, abi: Abi, functionName: string, args: unknown[]) {
    const hash = await w.writeContract({ address, abi, functionName, args, chain: foundry, account: w.account! });
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${functionName} reverted`);
    return r;
  }

  const appCompose = readFileSync(new URL("../../harness-node/app-compose.json", import.meta.url), "utf8");
  const composeHash = composeHashOf(appCompose);
  const publicCases = loadCorpus().cases.map((c) => c.case);
  const corpusRoot = merkleRoot(publicCases.map(leafOf));
  const holdout = { cases: [], salt: keccak256(toHex("no-holdout")) };
  const commit = holdoutCommit(keccak256(toHex("empty-holdout-root")), holdout.salt);
  const enclaves = [Enclave.generate(), Enclave.generate(), Enclave.generate()];

  let usdg: Address, blrd: Address, identity: Address, attesters: Address, feeRouter: Address, registry: Address;

  beforeAll(async () => {
    anvil = spawn("anvil", ["--port", String(PORT), "--chain-id", "31337", "--silent"], { stdio: "ignore" });
    for (let i = 0; i < 50; i++) {
      try {
        await pub.getBlockNumber();
        break;
      } catch {
        await Bun.sleep(100);
      }
    }
    usdg = await deploy(A.erc20, ["Test USDG", "tUSDG", 6]);
    blrd = await deploy(A.erc20, ["Test BLRD", "tBLRD", 18]);
    identity = await deploy(A.identity, []);
    const reputation = await deploy(A.reputation, []);
    const g = gov.account!.address;
    attesters = await deploy(A.attesters, [blrd, g, g, parseEther("1000"), 10n * 86_400n, 86_400n, parseEther("100")]);
    feeRouter = await deploy(A.feeRouter, [g, g, g, g, g, usdg, 99_000_000n]);
    const params = {
      quorum: 2, minSeeds: 8, scoreTolerance: 10, criticalMask: 0xb7, requiredTestedMask: 0xff,
      maxTtl: 30n * 86_400n, maxReportAge: 86_400n, disputeWindow: 72n * 3600n, tiebreakWindow: 72n * 3600n,
      requestTtl: 14n * 86_400n, runFee: 300_000_000n, disputeSlashAmount: parseEther("1000"),
    };
    registry = await deploy(A.registry, [attesters, feeRouter, usdg, g, g, identity, reputation, params]);

    await send(gov, attesters, A.attesters.abi, "setSlasher", [registry]);
    await send(gov, attesters, A.attesters.abi, "setAllowedOs", [DEV_OS_MEASUREMENT, true]);
    await send(gov, attesters, A.attesters.abi, "setAllowedCompose", [composeHash, true]);
    await send(gov, registry, A.registry.abi, "publishCorpus", [corpusRoot, commit, "ipfs://bollard-corpus-test"]);
  }, 60_000);

  afterAll(() => {
    anvil?.kill("SIGKILL");
  });

  test("dev-attested enclave keys register and pass the watcher check", async () => {
    const dev = new DevDcapVerifier(31337);
    for (let i = 0; i < 3; i++) {
      const w = wallet(i + 1);
      await send(gov, blrd, A.erc20.abi, "mint", [w.account!.address, parseEther("1000")]);
      await send(w, blrd, A.erc20.abi, "approve", [attesters, parseEther("1000")]);
      await send(w, attesters, A.attesters.abi, "bond", [parseEther("1000")]);
      const q = devQuote({ chainId: 31337, registry: attesters, key: enclaves[i]!.address, composeHash });
      await send(w, attesters, A.attesters.abi, "registerEnclaveKey", [enclaves[i]!.address, q.quote, composeHash]);
      const verdict = await verifyRegistration(
        { ...q, appCompose, composeHash, key: enclaves[i]!.address, chainId: 31337, registry: attesters },
        dev,
        new Set([DEV_OS_MEASUREMENT.toLowerCase()]),
      );
      expect(verdict).toMatchObject({ ok: true });
    }
    // past the 24h key challenge window
    await pub.request({ method: "evm_increaseTime" as never, params: [86_401] as never });
    await pub.request({ method: "evm_mine" as never, params: [] as never });
    for (const e of enclaves) {
      expect(await pub.readContract({ address: attesters, abi: A.attesters.abi, functionName: "isActiveKey", args: [e.address] })).toBe(true);
    }
  }, 60_000);

  test("request -> lead run -> co-sign -> postRating -> check() OK", async () => {
    await send(gov, identity, A.identity.abi, "register", [owner.account!.address, owner.account!.address]);
    const agentId = 1n;
    const versionHash = keccak256(toHex("hardened-agent-v1"));
    await send(gov, usdg, A.erc20.abi, "mint", [owner.account!.address, 1_000_000_000n]);
    await send(owner, usdg, A.erc20.abi, "approve", [registry, 1_000_000_000n]);
    const req = await send(owner, registry, A.registry.abi, "requestRun", [identity, agentId, versionHash, `0x${"00".repeat(32)}`]);
    await pub.request({ method: "evm_mine" as never, params: [] as never });
    const next = await pub.getBlock({ blockNumber: req.blockNumber + 1n });
    const now = Number((await pub.getBlock()).timestamp) * 1000;

    const isActiveKey = (key: Address) =>
      pub.readContract({ address: attesters, abi: A.attesters.abi, functionName: "isActiveKey", args: [key] }) as Promise<boolean>;
    const [leadE, coE] = enclaves as [Enclave, Enclave, Enclave];

    const { signed, report } = await leadRun({
      job: {
        chainId: 31337,
        registry,
        agentRegistry: identity,
        agentId,
        versionHash,
        requestId: 1n,
        requestNextBlockHash: next.hash!,
        endpoint: "http://127.0.0.1:1/hardened",
        runToken: "t",
      },
      publicCases,
      corpusRoot,
      holdoutCommit: commit,
      enclave: leadE,
      quoteHash: keccak256(toHex("lead-quote")),
      cosigners: [{ address: coE.address, publicKey: coE.publicKey }],
      agent: new FunctionAgentClient(hardened),
      now,
    });
    const co = await cosign({ signed, publicCases, me: coE, isActiveKey, now });
    expect(co.ok).toBe(true);
    if (!co.ok) throw new Error(co.problems.join("; "));

    // the TS digest equals the contract's digestOf
    const r = reportOf(signed.bundle);
    const onchainDigest = await pub.readContract({ address: registry, abi: A.registry.abi, functionName: "digestOf", args: [r] });
    expect(onchainDigest).toBe(report.digest);

    await send(gov, registry, A.registry.abi, "postRating", [r, [leadE.address, coE.address], [report.signature, co.signature]]);
    const [ok, code, validUntil] = (await pub.readContract({
      address: registry,
      abi: A.registry.abi,
      functionName: "check",
      args: [identity, agentId, 5, 0xff],
    })) as [boolean, number, bigint];
    expect({ ok, code, validUntil }).toEqual({ ok: true, code: 0, validUntil: r.expiresAt });

    const rating = (await pub.readContract({ address: registry, abi: A.registry.abi, functionName: "getRating", args: [1n] })) as [
      { grade: number; score: number },
      number,
      bigint,
      bigint,
      Address[],
    ];
    expect(rating[0].grade).toBe(5);
    expect(rating[4].map((a) => getAddress(a))).toEqual([1, 2].map((i) => getAddress(privateKeyToAccount(KEYS[i]!).address)));
  }, 120_000);
});
