/**
 * Executes a Safe Transaction Builder batch (contracts/deployments/rhc-mainnet-safe-batch.json) on the brand
 * Safe, one plain CALL per transaction, signed by SAFE_OWNER1 and SAFE_OWNER2 from .env.mainnet.local
 * (2-of-3). DEPLOYER pays gas. Refuses any transaction that sends value.
 *
 *   bun scripts/safe-exec.ts            # shows what would run
 *   bun scripts/safe-exec.ts --yes
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { concat, createPublicClient, createWalletClient, defineChain, http, parseAbi, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount, sign } from "viem/accounts";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const env = Object.fromEntries(
  readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
);
const batch = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-mainnet-safe-batch.json`, "utf8")) as { transactions: { to: Address; value: string; data: Hex }[] };
const SAFE = env.SAFE_ADDRESS as Address;
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account: privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY as Hex) });
const safeAbi = parseAbi([
  "function nonce() view returns (uint256)",
  "function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)",
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) payable returns (bool)",
]);
const owners = [env.SAFE_OWNER1_PRIVATE_KEY, env.SAFE_OWNER2_PRIVATE_KEY].map((k) => ({ key: k as Hex, address: privateKeyToAccount(k as Hex).address }));
owners.sort((a, b) => (a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1)); // Safe wants ascending owners

for (const [i, tx] of batch.transactions.entries()) {
  if (BigInt(tx.value) !== 0n) throw new Error(`transaction ${i} sends value; refusing`);
  console.log(`${i + 1}/${batch.transactions.length}: call ${tx.to} ${tx.data.slice(0, 10)}…`);
  if (!process.argv.includes("--yes")) continue;
  const nonce = await pub.readContract({ address: SAFE, abi: safeAbi, functionName: "nonce" });
  const hash = await pub.readContract({ address: SAFE, abi: safeAbi, functionName: "getTransactionHash", args: [tx.to, 0n, tx.data, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, nonce] });
  const sigs = await Promise.all(owners.map((o) => sign({ hash, privateKey: o.key, to: "hex" })));
  const h = await wallet.writeContract({ address: SAFE, abi: safeAbi, functionName: "execTransaction", args: [tx.to, 0n, tx.data, 0, 0n, 0n, 0n, zeroAddress, zeroAddress, concat(sigs)] });
  const r = await pub.waitForTransactionReceipt({ hash: h });
  console.log(`   ${r.status} ${h}`);
  if (r.status !== "success") throw new Error("execTransaction reverted");
}
if (!process.argv.includes("--yes")) console.log("Plan only. Add --yes to execute.");
