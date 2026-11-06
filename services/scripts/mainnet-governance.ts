/**
 * Mainnet launch governance through the 48h BollardTimelock. The Safe is the only proposer, so this script
 * writes a Safe Transaction Builder batch (one timelock.schedule per call); anyone can execute after 48h.
 *
 *   bun scripts/mainnet-governance.ts os <rawQuoteHex>           # OS measurement from a node's printed quote
 *   bun scripts/mainnet-governance.ts batch <osMeasurement> <composeHash>    # writes contracts/deployments/rhc-mainnet-safe-batch.json
 *   bun scripts/mainnet-governance.ts status <osMeasurement> <composeHash>
 *   bun scripts/mainnet-governance.ts execute <osMeasurement> <composeHash>  # POSTER_PRIVATE_KEY from .env.mainnet.local pays gas
 *
 * Both values come from a running Phala CVM: the OS measurement from its quote (`os`), the compose hash from its
 * printed registerEnclaveKey line (Phala builds the app-compose itself, so it is not computed locally).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, encodeFunctionData, hexToBytes, http, parseAbi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { osMeasurement, parseTdxV4 } from "../src/attest/tdx.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const CORPUS_ROOT: Hex = "0x7c08b6d115f0bd10d6250cb86a30abf1de6789c1482a422621f302da72b8b225";
const HOLDOUT_COMMIT: Hex = "0x22f2ef54de5c38b1b976f16b25ace1cc2686c2e0002786aec8938803c38a6331"; // 16 private cases
const CORPUS_URI = "https://github.com/BollardRh/Bollard/tree/main/services/corpus/public";
const SALT: Hex = `0x${"0".repeat(64)}`;

const [cmd, arg, composeArg] = process.argv.slice(2);
if (cmd === "os") {
  console.log(osMeasurement(parseTdxV4(hexToBytes(arg as Hex))));
  process.exit(0);
}
const isHash = (h?: string) => !!h && /^0x[0-9a-fA-F]{64}$/.test(h);
if (!isHash(arg) || !isHash(composeArg)) throw new Error("usage: <batch|status|execute> <osMeasurement> <composeHash>");

const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-mainnet.json`, "utf8"));
const composeHash = composeArg as Hex;
const att = parseAbi([
  "function setSlasher(address)",
  "function setAllowedOs(bytes32,bool)",
  "function setAllowedCompose(bytes32,bool)",
]);
const reg = parseAbi(["function publishCorpus(bytes32,bytes32,string)"]);
const tl = parseAbi([
  "function schedule(address,uint256,bytes,bytes32) returns (bytes32)",
  "function execute(address,uint256,bytes,bytes32) payable",
  "function opId(address,uint256,bytes,bytes32) pure returns (bytes32)",
  "function readyAt(bytes32) view returns (uint64)",
]);
const ops: { name: string; to: Address; data: Hex }[] = [
  { name: "setSlasher", to: d.attesterRegistry, data: encodeFunctionData({ abi: att, functionName: "setSlasher", args: [d.ratingRegistry] }) },
  { name: "setAllowedOs", to: d.attesterRegistry, data: encodeFunctionData({ abi: att, functionName: "setAllowedOs", args: [arg as Hex, true] }) },
  { name: "setAllowedCompose", to: d.attesterRegistry, data: encodeFunctionData({ abi: att, functionName: "setAllowedCompose", args: [composeHash, true] }) },
  { name: "publishCorpus", to: d.ratingRegistry, data: encodeFunctionData({ abi: reg, functionName: "publishCorpus", args: [CORPUS_ROOT, HOLDOUT_COMMIT, CORPUS_URI] }) },
];

const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });

if (cmd === "batch") {
  const batch = {
    version: "1.0",
    chainId: "4663",
    createdAt: Date.now(),
    meta: { name: "Bollard mainnet launch governance", description: `Schedules ${ops.map((o) => o.name).join(", ")} on the 48h timelock. Compose ${composeHash}.` },
    transactions: ops.map((o) => ({
      to: d.timelock,
      value: "0",
      data: encodeFunctionData({ abi: tl, functionName: "schedule", args: [o.to, 0n, o.data, SALT] }),
    })),
  };
  const out = `${ROOT}contracts/deployments/rhc-mainnet-safe-batch.json`;
  writeFileSync(out, JSON.stringify(batch, null, 2) + "\n");
  console.log(`wrote ${out}: ${ops.length} schedule calls to timelock ${d.timelock} (compose ${composeHash})`);
} else if (cmd === "status" || cmd === "execute") {
  const env = Object.fromEntries(
    readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
  );
  const wallet = createWalletClient({ chain, transport: http(RPC), account: privateKeyToAccount(env.POSTER_PRIVATE_KEY as Hex) });
  const now = BigInt(Math.floor(Date.now() / 1000));
  for (const o of ops) {
    const id = await pub.readContract({ address: d.timelock, abi: tl, functionName: "opId", args: [o.to, 0n, o.data, SALT] });
    const ready = await pub.readContract({ address: d.timelock, abi: tl, functionName: "readyAt", args: [id] });
    const state = ready === 0n ? "not scheduled (or done)" : ready > now ? `ready in ${Math.ceil(Number(ready - now) / 3600)}h` : "ready";
    console.log(`${o.name}: ${state}`);
    if (cmd === "execute" && ready !== 0n && ready <= now) {
      const hash = await wallet.writeContract({ address: d.timelock, abi: tl, functionName: "execute", args: [o.to, 0n, o.data, SALT] });
      const r = await pub.waitForTransactionReceipt({ hash });
      console.log(`  executed ${hash} (${r.status})`);
    }
  }
} else {
  throw new Error(`unknown command ${cmd}`);
}
