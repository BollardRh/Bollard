/**
 * Mainnet attesters ATTESTER1–3 (keys in .env.mainnet.local).
 *
 *   bun scripts/mainnet-attesters.ts status
 *   bun scripts/mainnet-attesters.ts bond                # each attester approves and bonds minBond USDG (owner runs this)
 *   bun scripts/mainnet-attesters.ts register <n> '<json>' # n = 1..3; json = the registerEnclaveKey line a CVM printed
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-mainnet.json`, "utf8"));
const env = Object.fromEntries(
  readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
);
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"]);
const reg = parseAbi([
  "function minBond() view returns (uint256)",
  "function bond(uint256)",
  "function registerEnclaveKey(address key, bytes rawQuote, bytes32 composeHash)",
]);
const acct = (n: number) => privateKeyToAccount(env[`ATTESTER${n}_PRIVATE_KEY`] as Hex);
const send = async (n: number, address: Address, abi: any, functionName: string, args: unknown[]) => {
  const w = createWalletClient({ chain, transport: http(RPC), account: acct(n) });
  const hash = await w.writeContract({ address, abi, functionName, args } as any);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return hash;
};

const [cmd, nArg, json] = process.argv.slice(2);
const minBond = (await pub.readContract({ address: d.attesterRegistry, abi: reg, functionName: "minBond" })) as bigint;
if (cmd === "status" || cmd === "bond") {
  for (const n of [1, 2, 3]) {
    const a = acct(n).address;
    const [eth, usdg] = await Promise.all([pub.getBalance({ address: a }), pub.readContract({ address: d.usdg, abi: erc20, functionName: "balanceOf", args: [a] })]);
    console.log(`ATTESTER${n} ${a}: ${formatUnits(eth, 18)} ETH, ${formatUnits(usdg, 6)} USDG (bond ${formatUnits(minBond, 6)})`);
    if (cmd !== "bond") continue;
    if (usdg < minBond) throw new Error(`ATTESTER${n} needs ${formatUnits(minBond, 6)} USDG`);
    const allowance = await pub.readContract({ address: d.usdg, abi: erc20, functionName: "allowance", args: [a, d.attesterRegistry] });
    if (allowance < minBond) await send(n, d.usdg, erc20, "approve", [d.attesterRegistry, minBond]);
    console.log(`  bonded: ${await send(n, d.attesterRegistry, reg, "bond", [minBond])}`);
  }
} else if (cmd === "register") {
  const r = JSON.parse(json!).registerEnclaveKey;
  console.log(`registered: ${await send(Number(nArg), d.attesterRegistry, reg, "registerEnclaveKey", [r.key, r.rawQuote, r.composeHash])}`);
} else {
  throw new Error("usage: status | bond | register <n> '<json>'");
}
