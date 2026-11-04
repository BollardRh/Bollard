/**
 * Live dispute drill on Robinhood Chain testnet: dispute -> tiebreak -> slashing -> fee release, plus an
 * equivocation proof. Uses throwaway dev attesters (not in TRUSTED_ATTESTERS, so they never get real work).
 *
 *   set -a; source .env.testnet.local; set +a
 *   bun services/scripts/dispute-testnet.ts setup                 # 5 attesters: bond + register dev enclave keys
 *   bun services/scripts/dispute-testnet.ts dispute <ratingId>    # 2 "dishonest" attesters dispute with a false report
 *   bun services/scripts/dispute-testnet.ts resolve <ratingId>    # 3 honest attesters re-sign the original: dishonest side slashed
 *   bun services/scripts/dispute-testnet.ts equivocate            # one key signs two results for one run: full slash
 *
 * Keys live in .dev-nodes/dispute.json (gitignored). Testnet only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount, sign } from "viem/accounts";
import { attesterRegistryAbi, ratingRegistryAbi } from "../src/chain/abis.ts";
import { reportDigest, type RatingReport } from "../src/chain/report.ts";
import { grade } from "../src/harness/scoring.ts";
import { devQuote } from "../src/attest/devAttestor.ts";
import { composeHashOf } from "../src/attest/rtmr.ts";
import { CHECK_CODES } from "../src/chain/config.ts";

const ROOT = new URL("../../", import.meta.url).pathname;
const RPC = process.env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
if (!process.env.OPS_PRIVATE_KEY) throw new Error("source .env.testnet.local first");
const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-testnet.json`, "utf8")) as Record<string, string>;
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC, { retryCount: 5 }) });
const ops = privateKeyToAccount(process.env.OPS_PRIVATE_KEY as Hex);
const wallet = (key: Hex) => createWalletClient({ chain, transport: http(RPC, { retryCount: 5 }), account: privateKeyToAccount(key) });
const opsW = wallet(process.env.OPS_PRIVATE_KEY as Hex);
const registry = getAddress(d.ratingRegistry!);
const attesters = getAddress(d.attesterRegistry!);
const blrd = getAddress(d.tBLRD!);
const identity = getAddress(d.identity8004!);
const mintAbi = parseAbi(["function mint(address to, uint256 amount)", "function approve(address, uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"]);
const MEMO = `${ROOT}.dev-nodes/dispute.json`;
const explorer = (h: Hex) => `https://explorer.testnet.chain.robinhood.com/tx/${h}`;

type Member = { attesterKey: Hex; attester: Address; enclaveKey: Hex; enclave: Address };
const load = (): Member[] => (existsSync(MEMO) ? (JSON.parse(readFileSync(MEMO, "utf8")) as Member[]) : []);

async function send(key: Hex, address: Address, abi: readonly unknown[], functionName: string, args: readonly unknown[], what: string) {
  const w = wallet(key);
  const { request } = await pub.simulateContract({ address, abi, functionName, args, account: w.account } as never);
  const hash = await w.writeContract(request as never);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${what} reverted: ${hash}`);
  console.log(`  ok   ${what}  ${explorer(hash)}`);
  return r;
}

// ------------------------------------------------------------------ setup
async function setup() {
  const members = load();
  const appCompose = readFileSync(`${ROOT}harness-node/app-compose.dev.json`, "utf8");
  const composeHash = composeHashOf(appCompose);
  const minBond = (await pub.readContract({ address: attesters, abi: attesterRegistryAbi, functionName: "minBond" })) as bigint;
  while (members.length < 5) {
    const attesterKey = generatePrivateKey();
    const enclaveKey = generatePrivateKey();
    members.push({ attesterKey, attester: privateKeyToAccount(attesterKey).address, enclaveKey, enclave: privateKeyToAccount(enclaveKey).address });
  }
  mkdirSync(`${ROOT}.dev-nodes`, { recursive: true });
  writeFileSync(MEMO, JSON.stringify(members, null, 2), { mode: 0o600 });
  for (const [i, m] of members.entries()) {
    console.log(`attester ${i + 1}: ${m.attester} (enclave key ${m.enclave})`);
    const registered = ((await pub.readContract({ address: attesters, abi: attesterRegistryAbi, functionName: "attesterOf", args: [m.enclave] })) as string).toLowerCase();
    if (registered === m.attester.toLowerCase()) {
      console.log("  already registered");
      continue;
    }
    if ((await pub.getBalance({ address: m.attester })) < parseEther("0.00005")) {
      const hash = await opsW.sendTransaction({ to: m.attester, value: parseEther("0.0001") });
      await pub.waitForTransactionReceipt({ hash });
      console.log(`  ok   gas from OPS  ${explorer(hash)}`);
    }
    await send(m.attesterKey, blrd, mintAbi, "mint", [m.attester, minBond], "mint tBLRD");
    await send(m.attesterKey, blrd, mintAbi, "approve", [attesters, minBond], "approve bond");
    await send(m.attesterKey, attesters, attesterRegistryAbi, "bond", [minBond], "bond");
    const q = devQuote({ chainId: 46630, registry: attesters, key: m.enclave, composeHash });
    await send(m.attesterKey, attesters, attesterRegistryAbi, "registerEnclaveKey", [m.enclave, q.quote, composeHash], "registerEnclaveKey");
  }
  const window = (await pub.readContract({ address: attesters, abi: attesterRegistryAbi, functionName: "keyChallengeWindow" })) as bigint;
  console.log(`\nkeys become active after the ${window}s challenge window`);
}

// ------------------------------------------------------------------ helpers
async function originalReport(ratingId: bigint): Promise<RatingReport> {
  const r = (await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "getRating", args: [ratingId] })) as unknown as readonly [RatingReport, ...unknown[]];
  return r[0];
}
const signAll = async (members: Member[], report: RatingReport) => {
  const digest = reportDigest(46630, registry, report);
  return { keys: members.map((m) => m.enclave), sigs: await Promise.all(members.map((m) => sign({ hash: digest, privateKey: m.enclaveKey, to: "hex" }))) };
};
async function gate(agentId: bigint) {
  const [ok, code] = (await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "check", args: [identity, agentId, 3, 0xb7] })) as [boolean, number, bigint];
  return ok ? "OK" : CHECK_CODES[code];
}
const bondOf = async (a: Address) => ((await pub.readContract({ address: attesters, abi: attesterRegistryAbi, functionName: "attesters", args: [a] })) as readonly unknown[])[0] as bigint;

/** A report with the same inputs that differs materially (a critical family failed, lower score). */
function falseReport(orig: RatingReport, criticalMask: number): RatingReport {
  const failedMask = (Number(orig.failedMask) | 0x01) & Number(orig.testedMask);
  const score = Math.max(0, Number(orig.score) - 40);
  return { ...orig, score, failedMask, grade: grade(score, failedMask, criticalMask) };
}

// ------------------------------------------------------------------ dispute
async function dispute(ratingId: bigint) {
  const m = load();
  if (m.length < 5) throw new Error("run setup first");
  const orig = await originalReport(ratingId);
  const p = (await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "params" })) as readonly unknown[];
  const counter = falseReport(orig, Number(p[3]));
  console.log(`rating ${ratingId}: agent ${orig.agentId}, original grade ${orig.grade} score ${orig.score}; false report grade ${counter.grade} score ${counter.score}`);
  console.log(`  gate before: ${await gate(orig.agentId)}`);
  const { keys, sigs } = await signAll(m.slice(0, 2), counter);
  await send(process.env.OPS_PRIVATE_KEY as Hex, registry, ratingRegistryAbi, "disputeRating", [ratingId, counter, keys, sigs], "disputeRating (2 dishonest attesters)");
  console.log(`  gate after:  ${await gate(orig.agentId)}  (fails closed while disputed)`);
}

// ------------------------------------------------------------------ resolve
async function resolve(ratingId: bigint) {
  const m = load();
  const orig = await originalReport(ratingId);
  const dishonest = m.slice(0, 2).map((x) => x.attester);
  const before = await Promise.all(dishonest.map(bondOf));
  const opsBlrd = (await pub.readContract({ address: blrd, abi: mintAbi, functionName: "balanceOf", args: [ops.address] })) as bigint;
  const { keys, sigs } = await signAll(m.slice(2, 5), orig);
  const r = await send(process.env.OPS_PRIVATE_KEY as Hex, registry, ratingRegistryAbi, "resolveDispute", [ratingId, orig, keys, sigs], "resolveDispute (3 honest attesters re-sign the original)");
  for (const l of r.logs) {
    try {
      const ev = decodeEventLog({ abi: ratingRegistryAbi, data: l.data, topics: l.topics });
      if (ev.eventName === "DisputeResolved") console.log(`  DisputeResolved: ${JSON.stringify(ev.args, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`);
    } catch {
      /* other contracts */
    }
  }
  const after = await Promise.all(dishonest.map(bondOf));
  dishonest.forEach((a, i) => console.log(`  dishonest attester ${a}: bond ${before[i]! / 10n ** 18n} -> ${after[i]! / 10n ** 18n} tBLRD`));
  const opsAfter = (await pub.readContract({ address: blrd, abi: mintAbi, functionName: "balanceOf", args: [ops.address] })) as bigint;
  console.log(`  resolver (OPS) received ${(opsAfter - opsBlrd) / 10n ** 18n} tBLRD (half of each slash)`);
  console.log(`  gate after: ${await gate(orig.agentId)}`);
  try {
    await send(process.env.OPS_PRIVATE_KEY as Hex, registry, ratingRegistryAbi, "releaseFees", [ratingId], "releaseFees (now final)");
  } catch (e) {
    console.log(`  releaseFees: ${(e as Error).message.split("\n")[0]}`);
  }
}

// ------------------------------------------------------------------ equivocation
async function equivocate() {
  const m = load();
  const liar = m[4]!; // a tiebreak attester, used once more as the equivocator
  const orig = await originalReport(3n);
  const p = (await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "params" })) as readonly unknown[];
  const other = falseReport(orig, Number(p[3]));
  const [a, b] = await Promise.all([signAll([liar], orig), signAll([liar], other)]);
  const before = await bondOf(liar.attester);
  await send(process.env.OPS_PRIVATE_KEY as Hex, registry, ratingRegistryAbi, "proveEquivocation", [orig, a.sigs[0], other, b.sigs[0]], "proveEquivocation");
  console.log(`  equivocating attester ${liar.attester}: bond ${before / 10n ** 18n} -> ${(await bondOf(liar.attester)) / 10n ** 18n} tBLRD`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "setup") await setup();
else if (cmd === "dispute" && arg) await dispute(BigInt(arg));
else if (cmd === "resolve" && arg) await resolve(BigInt(arg));
else if (cmd === "equivocate") await equivocate();
else throw new Error("usage: dispute-testnet.ts setup | dispute <ratingId> | resolve <ratingId> | equivocate");
