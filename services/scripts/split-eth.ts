/**
 * Owner-run: splits the ETH sent to DEPLOYER across the other mainnet wallets (.env.mainnet.local).
 * Keeps 0.0012 ETH on DEPLOYER (Safe + contract deploy), then 40% to POSTER and 20% to each attester.
 *
 *   bun scripts/split-eth.ts          # shows the plan
 *   bun scripts/split-eth.ts --yes    # sends it
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, formatEther, http, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const env = Object.fromEntries(
  readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
);
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const from = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY as Hex);
const wallet = createWalletClient({ chain, transport: http(RPC), account: from });

const KEEP = parseEther("0.0012");
const balance = await pub.getBalance({ address: from.address });
if (balance < parseEther("0.0035")) throw new Error(`DEPLOYER ${from.address} has ${formatEther(balance)} ETH; send at least 0.0035`);
const rest = balance - KEEP;
const plan: [string, Address, bigint][] = [
  ["POSTER", env.POSTER_ADDRESS as Address, (rest * 40n) / 100n],
  ["ATTESTER1", env.ATTESTER1_ADDRESS as Address, (rest * 20n) / 100n],
  ["ATTESTER2", env.ATTESTER2_ADDRESS as Address, (rest * 20n) / 100n],
  ["ATTESTER3", env.ATTESTER3_ADDRESS as Address, (rest * 20n) / 100n],
];
console.log(`DEPLOYER ${from.address}: ${formatEther(balance)} ETH, keeps ~${formatEther(KEEP)}`);
for (const [n, a, v] of plan) console.log(`  ${n} ${a}: ${formatEther(v)} ETH`);
if (!process.argv.includes("--yes")) {
  console.log("Plan only. Add --yes to send.");
  process.exit(0);
}
for (const [n, to, value] of plan) {
  const hash = await wallet.sendTransaction({ to, value });
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`${n}: ${r.status} ${hash}`);
}
