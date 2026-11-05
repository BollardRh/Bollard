/**
 * One real rating on Robinhood Chain testnet, from the builder's side:
 *   register an agent on the live ERC-8004 identity registry (once), pay the run fee in tUSDG, request a run,
 *   sign the BATP endpoint over to the API, then follow it until check() passes.
 *
 *   set -a; source .env.testnet.local; set +a
 *   BOLLARD_API_URL=https://<project>.vercel.app AGENT=hardened bun services/scripts/testnet-rating-demo.ts
 *
 * Uses the OPS key as the agent owner (testnet only). The agent is one of the API's testnet mock agents.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { EIP712_TYPES } from "../src/api/builder.ts";
import { erc20Abi, ratingRegistryAbi } from "../src/chain/abis.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url)); // works on Windows too
const API = (process.env.BOLLARD_API_URL ?? "").replace(/\/$/, "");
const AGENT = process.env.AGENT ?? "hardened";
const RPC = process.env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
if (!API || !process.env.OPS_PRIVATE_KEY) throw new Error("set BOLLARD_API_URL and source .env.testnet.local");

const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-testnet.json`, "utf8")) as Record<string, string>;
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const owner = privateKeyToAccount(process.env.OPS_PRIVATE_KEY as Hex);
const wallet = createWalletClient({ chain, transport: http(RPC), account: owner });
const identity = d.identity8004 as Address;
const registry = d.ratingRegistry as Address;
const usdg = d.tUSDG as Address;
const identityAbi = parseAbi(["function register(string agentURI) returns (uint256 agentId)", "function ownerOf(uint256) view returns (address)"]);

async function tx(p: Promise<Hex>, what: string) {
  const r = await pub.waitForTransactionReceipt({ hash: await p });
  if (r.status !== "success") throw new Error(`${what} reverted`);
  console.log(`  ${what}: ${r.transactionHash}`);
  return r;
}
const trpc = async (path: string, input: unknown, mutation = false) => {
  const r = mutation
    ? await fetch(`${API}/api/trpc/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
    : await fetch(`${API}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`);
  const j = (await r.json()) as { result?: { data: unknown }; error?: { message?: string } };
  if (j.error) throw new Error(`${path}: ${j.error.message ?? JSON.stringify(j.error)}`);
  return j.result?.data;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1. the agent (registered once, remembered in .dev-nodes/)
const memo = `${ROOT}.dev-nodes/demo-agent-${AGENT}.json`;
let agentId: bigint;
if (existsSync(memo)) {
  agentId = BigInt((JSON.parse(readFileSync(memo, "utf8")) as { agentId: string }).agentId);
  console.log(`agent ${agentId} (from ${memo})`);
} else {
  const uri = `${API}/api/mock-agents/${AGENT}`;
  const { result, request } = await pub.simulateContract({ address: identity, abi: identityAbi, functionName: "register", args: [uri], account: owner });
  await tx(wallet.writeContract(request), "ERC-8004 register");
  agentId = result;
  writeFileSync(memo, JSON.stringify({ agentId: agentId.toString(), uri }));
  console.log(`agent ${agentId} registered on ${identity}`);
}

// 2. pay and request a run for a fresh version
const versionHash = keccak256(toHex(`${AGENT}-mock-agent-${Date.now()}`));
const fee = ((await pub.readContract({ address: registry, abi: ratingRegistryAbi, functionName: "params" })) as readonly unknown[])[10] as bigint;
await tx(wallet.writeContract({ address: usdg, abi: erc20Abi, functionName: "mint", args: [owner.address, fee] }), "mint tUSDG fee");
await tx(wallet.writeContract({ address: usdg, abi: erc20Abi, functionName: "approve", args: [registry, fee] }), "approve fee");
const { result: requestId, request } = await pub.simulateContract({
  address: registry,
  abi: ratingRegistryAbi,
  functionName: "requestRun",
  args: [identity, agentId, versionHash, `0x${"00".repeat(32)}`],
  account: owner,
});
await tx(wallet.writeContract(request), `requestRun -> request ${requestId}`);

// 3. wait for the indexer, then name the endpoint
const rid = (requestId as bigint).toString();
for (let i = 0; ; i++) {
  if (await trpc("builder.runStatus", { chainId: 46630, requestId: rid })) break;
  if (i > 40) throw new Error("request not indexed after ~4 minutes");
  await sleep(6000);
}
const endpoint = `${API}/api/mock-agents/${AGENT}`;
const issuedAt = Math.floor(Date.now() / 1000);
const deadline = issuedAt + 600;
const signature = await owner.signTypedData({
  domain: { name: "Bollard", version: "1", chainId: 46630, verifyingContract: registry },
  types: EIP712_TYPES,
  primaryType: "SetEndpoint",
  message: { requestId: requestId as bigint, endpoint, issuedAt: BigInt(issuedAt), deadline: BigInt(deadline) },
});
await trpc("builder.setEndpoint", { chainId: 46630, requestId: rid, endpoint, issuedAt, deadline, signature }, true);
console.log(`endpoint set: ${endpoint}`);

// 4. follow the run
let last = "";
for (let i = 0; i < 120; i++) {
  const s = (await trpc("builder.runStatus", { chainId: 46630, requestId: rid })) as { status: string; bundle: { grade: number; postedTx: string | null } | null };
  const now = `${s.status}${s.bundle ? ` bundle grade ${s.bundle.grade}${s.bundle.postedTx ? ` posted ${s.bundle.postedTx}` : ""}` : ""}`;
  if (now !== last) console.log(`  ${new Date().toISOString().slice(11, 19)} ${now}`);
  last = now;
  if (s.status === "rated") break;
  await sleep(15000);
}
const check = await (await fetch(`${API}/v1/check/46630/${agentId}?min=1&mask=0`)).json();
console.log("check:", check);
