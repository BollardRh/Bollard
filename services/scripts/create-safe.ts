/**
 * Creates the brand Safe (v1.4.1 L2, canonical deployments verified on Robinhood Chain mainnet) from the
 * DEPLOYER key in .env.mainnet.local. The deployer only pays gas; it is not an owner.
 *
 *   bun scripts/create-safe.ts <owner1,owner2,...> <threshold>
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, getAddress, http, parseAbi, parseEventLogs, zeroAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const SAFE_L2 = "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
const FACTORY = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
const FALLBACK = "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99";
const RPC = "https://rpc.mainnet.chain.robinhood.com";

const [ownersArg, thresholdArg] = process.argv.slice(2);
const owners = (ownersArg ?? "").split(",").map((o) => getAddress(o.trim()));
const threshold = BigInt(thresholdArg ?? "0");
if (!owners.length || threshold < 1n || threshold > BigInt(owners.length)) throw new Error("usage: <owner1,owner2,...> <threshold>");

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const key = /DEPLOYER_PRIVATE_KEY=(0x[0-9a-f]{64})/.exec(readFileSync(`${ROOT}.env.mainnet.local`, "utf8"))![1] as Hex;
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account: privateKeyToAccount(key) });

const initializer = encodeFunctionData({
  abi: parseAbi(["function setup(address[] owners,uint256 threshold,address to,bytes data,address fallbackHandler,address paymentToken,uint256 payment,address paymentReceiver)"]),
  functionName: "setup",
  args: [owners, threshold, zeroAddress, "0x", FALLBACK, zeroAddress, 0n, zeroAddress],
});
const factoryAbi = parseAbi([
  "function createProxyWithNonce(address singleton, bytes initializer, uint256 saltNonce) returns (address)",
  "event ProxyCreation(address indexed proxy, address singleton)",
]);
const hash = await wallet.writeContract({ address: FACTORY, abi: factoryAbi, functionName: "createProxyWithNonce", args: [SAFE_L2, initializer, BigInt(Date.now())] });
const receipt = await pub.waitForTransactionReceipt({ hash });
const [created] = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: "ProxyCreation" });
const safe = created!.args.proxy;
const got = await pub.readContract({ address: safe, abi: parseAbi(["function getOwners() view returns (address[])", "function getThreshold() view returns (uint256)"]), functionName: "getOwners" });
console.log(`Safe ${safe} (tx ${hash}): owners ${got.join(", ")}, threshold ${threshold}`);
