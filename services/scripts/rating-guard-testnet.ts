/**
 * SafeRatingGuard on Robinhood Chain testnet (Phase 9): a real Safe 1.4.1 whose AllowanceModule delegates are
 * gated by Bollard ratings.
 *
 *   set -a; source .env.testnet.local; set +a
 *   GOOD_AGENT=291 LOW_AGENT=<id> bun services/scripts/rating-guard-testnet.ts
 *
 * GOOD_AGENT's ERC-8004 wallet must be the OPS address and LOW_AGENT's the POSTER address (agentWallet
 * defaults to the registering owner). Steps, all from the Safe (OPS is its only owner):
 *   1. create the Safe (once; remembered in .dev-nodes/safe.json)
 *   2. one MultiSend batch, before the guard is active: enable the AllowanceModule, guard.configure(1, 0),
 *      bind both delegates to their agents, enable the guard as a module, setGuard(guard)
 *   3. addDelegate(LOW wallet): passes the low floor (grade >= 1)
 *   4. raise the floor to grade 3 + critical families (applies at once; only lowering waits 24 h)
 *   5. addDelegate(GOOD wallet): passes
 *   6. setAllowance / addDelegate for the LOW wallet, directly and smuggled in a MultiSend: refused by the guard
 *   7. revokeIfFailing(safe, LOW wallet), sent by anyone: the guard removes the delegate through the module
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  BaseError,
  concat,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  encodePacked,
  http,
  pad,
  parseAbi,
  size,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ratingRegistryAbi, safeRatingGuardAbi } from "../src/chain/abis.ts";
import { CHECK_CODES } from "../src/chain/config.ts";

const ROOT = new URL("../../", import.meta.url).pathname;
const RPC = process.env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
const GOOD_AGENT = BigInt(process.env.GOOD_AGENT ?? "291");
const LOW_AGENT = process.env.LOW_AGENT ? BigInt(process.env.LOW_AGENT) : undefined;
if (!process.env.OPS_PRIVATE_KEY || !process.env.POSTER_ADDRESS || LOW_AGENT === undefined) throw new Error("source .env.testnet.local and set LOW_AGENT");

const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-testnet.json`, "utf8")) as Record<string, string>;
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const ops = privateKeyToAccount(process.env.OPS_PRIVATE_KEY as Hex);
const w = createWalletClient({ chain, transport: http(RPC), account: ops });

// Safe 1.4.1 + AllowanceModule v0.1.1 (canonical addresses, live on RHC testnet)
const SAFE_L2 = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as Address;
const PROXY_FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as Address;
const MULTI_SEND_CALL_ONLY = "0x9641d764fc13c8B624c04430C7356C1C7C8102e2" as Address;
const ALLOWANCE = "0xAA46724893dedD72658219405185Fb0Fc91e091C" as Address;
const guard = d.safeRatingGuard as Address;
const registry = d.ratingRegistry as Address;
const identity = d.identity8004 as Address;
const usdg = d.tUSDG as Address;
const GOOD = ops.address;
const LOW = process.env.POSTER_ADDRESS as Address;
const CRITICAL = 0xb7;

const safeAbi = parseAbi([
  "function setup(address[] owners, uint256 threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
  "function nonce() view returns (uint256)",
  "function enableModule(address module)",
  "function setGuard(address guard)",
  "function isModuleEnabled(address module) view returns (bool)",
  "event ExecutionFailure(bytes32 txHash, uint256 payment)",
  "error GS013()",
]);
const factoryAbi = parseAbi([
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address proxy)",
  "event ProxyCreation(address indexed proxy, address singleton)",
]);
const allowanceAbi = parseAbi([
  "function addDelegate(address delegate)",
  "function setAllowance(address delegate, address token, uint96 allowanceAmount, uint16 resetTimeMin, uint32 resetBaseMin)",
  "function getDelegates(address safe, uint48 start, uint8 pageSize) view returns (address[] results, uint48 next)",
]);
const multiSendAbi = parseAbi(["function multiSend(bytes transactions) payable"]);
const errorsAbi = [...safeRatingGuardAbi, ...safeAbi] as Abi;

const step = (n: string) => console.log(`\n${n}`);
const explorer = (h: Hex) => `https://explorer.testnet.chain.robinhood.com/tx/${h}`;

function errorName(e: unknown): string {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError && r.data) {
      const args = r.data.args?.map(String).join(", ") ?? "";
      const code = r.data.errorName === "RatingCheckFailed" ? ` = ${CHECK_CODES[Number(r.data.args?.[0])] ?? "?"}` : "";
      return `${r.data.errorName}(${args})${code}`;
    }
    return e.shortMessage;
  }
  return (e as Error).message;
}

// pre-validated signature: valid when the sender is an owner (threshold 1)
const ownerSig = concat([pad(ops.address, { size: 32 }), pad("0x0", { size: 32 }), "0x01"]);

async function exec(safe: Address, to: Address, data: Hex, operation: 0 | 1, what: string) {
  const args = [to, 0n, data, operation, 0n, 0n, 0n, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", ownerSig] as const;
  const { request } = await pub.simulateContract({ address: safe, abi: [...safeAbi, ...safeRatingGuardAbi] as Abi, functionName: "execTransaction", args, account: ops });
  const hash = await w.writeContract(request as never);
  const r = await pub.waitForTransactionReceipt({ hash });
  const failed = r.logs.some((l) => {
    try {
      return decodeEventLog({ abi: safeAbi, data: l.data, topics: l.topics }).eventName === "ExecutionFailure";
    } catch {
      return false;
    }
  });
  if (r.status !== "success" || failed) throw new Error(`${what} failed: ${hash}`);
  console.log(`  ok   ${what}  ${explorer(hash)}`);
  return hash;
}

/** Simulates a Safe transaction that the guard must refuse, and prints the refusal. */
async function expectRefused(safe: Address, to: Address, data: Hex, operation: 0 | 1, what: string) {
  try {
    await pub.simulateContract({
      address: safe,
      abi: [...safeAbi, ...safeRatingGuardAbi] as Abi,
      functionName: "execTransaction",
      args: [to, 0n, data, operation, 0n, 0n, 0n, "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", ownerSig],
      account: ops,
    });
  } catch (e) {
    console.log(`  refused  ${what}: ${errorName(e)}`);
    return;
  }
  throw new Error(`${what} was NOT refused`);
}

const packBatch = (txs: { to: Address; data: Hex }[]) =>
  concat(txs.map((t) => encodePacked(["uint8", "address", "uint256", "uint256", "bytes"], [0, t.to, 0n, BigInt(size(t.data)), t.data])));
const multiSend = (txs: { to: Address; data: Hex }[]) => encodeFunctionData({ abi: multiSendAbi, functionName: "multiSend", args: [packBatch(txs)] });
const call = (abi: Abi, functionName: string, args: readonly unknown[]) => encodeFunctionData({ abi, functionName, args } as never);

async function rating(agentId: bigint, minGrade: number, mask: number) {
  const [ok, code] = (await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "check", args: [identity, agentId, minGrade, mask] })) as [boolean, number, bigint];
  return ok ? "OK" : CHECK_CODES[code];
}

// ------------------------------------------------------------------ run
const wallets = parseAbi(["function getAgentWallet(uint256) view returns (address)"]);
for (const [id, want] of [[GOOD_AGENT, GOOD], [LOW_AGENT, LOW]] as const) {
  const got = (await pub.readContract({ address: identity, abi: wallets, functionName: "getAgentWallet", args: [id] })) as Address;
  if (got.toLowerCase() !== want.toLowerCase()) throw new Error(`agent ${id} wallet is ${got}, expected ${want}`);
}
console.log(`agent ${GOOD_AGENT} (wallet ${GOOD}): grade>=3 + critical -> ${await rating(GOOD_AGENT, 3, CRITICAL)}`);
console.log(`agent ${LOW_AGENT} (wallet ${LOW}): grade>=1 -> ${await rating(LOW_AGENT, 1, 0)}, grade>=3 + critical -> ${await rating(LOW_AGENT, 3, CRITICAL)}`);

const memoPath = `${ROOT}.dev-nodes/safe.json`;
const memo = existsSync(memoPath) ? (JSON.parse(readFileSync(memoPath, "utf8")) as { safe?: Address }) : {};
let safe = memo.safe;
if (!safe) {
  step("1. create the Safe (owner OPS, threshold 1)");
  const init = encodeFunctionData({
    abi: safeAbi,
    functionName: "setup",
    args: [[ops.address], 1n, "0x0000000000000000000000000000000000000000", "0x", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000", 0n, "0x0000000000000000000000000000000000000000"],
  });
  const { result, request } = await pub.simulateContract({ address: PROXY_FACTORY, abi: factoryAbi, functionName: "createProxyWithNonce", args: [SAFE_L2, init, BigInt(Date.now())], account: ops });
  const hash = await w.writeContract(request);
  await pub.waitForTransactionReceipt({ hash });
  safe = result;
  mkdirSync(`${ROOT}.dev-nodes`, { recursive: true });
  writeFileSync(memoPath, JSON.stringify({ safe }, null, 2));
  console.log(`  ok   Safe ${safe}  ${explorer(hash)}`);
} else {
  console.log(`\nSafe ${safe} (from ${memoPath})`);
}

if (!(await pub.readContract({ address: safe, abi: safeAbi, functionName: "isModuleEnabled", args: [guard] }))) {
  step("2. one batch: AllowanceModule on, floor (1, none), bind both delegates, guard as module, setGuard");
  await exec(
    safe,
    MULTI_SEND_CALL_ONLY,
    multiSend([
      { to: safe, data: call(safeAbi, "enableModule", [ALLOWANCE]) },
      { to: guard, data: call(safeRatingGuardAbi as Abi, "configure", [1, 0]) },
      { to: guard, data: call(safeRatingGuardAbi as Abi, "bindDelegate", [GOOD, identity, GOOD_AGENT]) },
      { to: guard, data: call(safeRatingGuardAbi as Abi, "bindDelegate", [LOW, identity, LOW_AGENT]) },
      { to: safe, data: call(safeAbi, "enableModule", [guard]) },
      { to: safe, data: call(safeAbi, "setGuard", [guard]) },
    ]),
    1,
    "batch",
  );
}

step("3. addDelegate(low-rated wallet) while the floor is grade 1");
await exec(safe, ALLOWANCE, call(allowanceAbi, "addDelegate", [LOW]), 0, `addDelegate(${LOW})`);

step("4. raise the floor to grade 3 + critical families (immediate)");
await exec(safe, guard, call(safeRatingGuardAbi as Abi, "configure", [3, CRITICAL]), 0, "configure(3, 0xb7)");

step("5. addDelegate(well-rated wallet)");
await exec(safe, ALLOWANCE, call(allowanceAbi, "addDelegate", [GOOD]), 0, `addDelegate(${GOOD})`);
await exec(safe, ALLOWANCE, call(allowanceAbi, "setAllowance", [GOOD, usdg, 50_000_000n, 1440, 0]), 0, "setAllowance(good, 50 tUSDG/day)");

step("6. the guard refuses the low-rated delegate");
await expectRefused(safe, ALLOWANCE, call(allowanceAbi, "setAllowance", [LOW, usdg, 50_000_000n, 1440, 0]), 0, "setAllowance(low)");
await expectRefused(safe, ALLOWANCE, call(allowanceAbi, "addDelegate", [LOW]), 0, "addDelegate(low)");
await expectRefused(safe, MULTI_SEND_CALL_ONLY, multiSend([{ to: ALLOWANCE, data: call(allowanceAbi, "setAllowance", [LOW, usdg, 50_000_000n, 1440, 0]) }]), 1, "setAllowance(low) inside a MultiSend");

step("7. anyone revokes the failing delegate (the guard acts as a Safe module)");
const before = ((await pub.readContract({ address: ALLOWANCE, abi: allowanceAbi, functionName: "getDelegates", args: [safe, 0, 10] })) as [Address[], number])[0];
console.log(`  delegates before: ${before.join(", ")}`);
try {
  await pub.simulateContract({ address: guard, abi: safeRatingGuardAbi, functionName: "revokeIfFailing", args: [safe, GOOD], account: ops });
  throw new Error("revoking a passing delegate was NOT refused");
} catch (e) {
  if ((e as Error).message.includes("NOT refused")) throw e;
  console.log(`  refused  revokeIfFailing(good): ${errorName(e)}`);
}
const { request } = await pub.simulateContract({ address: guard, abi: safeRatingGuardAbi, functionName: "revokeIfFailing", args: [safe, LOW], account: ops });
const hash = await w.writeContract(request);
const r = await pub.waitForTransactionReceipt({ hash });
if (r.status !== "success") throw new Error(`revokeIfFailing reverted: ${hash}`);
for (const l of r.logs) {
  try {
    const ev = decodeEventLog({ abi: safeRatingGuardAbi, data: l.data, topics: l.topics });
    if (ev.eventName === "DelegateRevoked") console.log(`  ok   DelegateRevoked(${(ev.args as { delegate: Address }).delegate}, code ${CHECK_CODES[Number((ev.args as { code: number }).code)]})  ${explorer(hash)}`);
  } catch {
    /* module events */
  }
}
const after = ((await pub.readContract({ address: ALLOWANCE, abi: allowanceAbi, functionName: "getDelegates", args: [safe, 0, 10] })) as [Address[], number])[0];
console.log(`  delegates after:  ${after.join(", ")}`);
if (after.map((a) => a.toLowerCase()).includes(LOW.toLowerCase())) throw new Error("low-rated delegate still present");
console.log("\ndone");
