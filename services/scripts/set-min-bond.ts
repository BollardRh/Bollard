/**
 * Changes the attester minimum bond through the 48h timelock. Only minBond changes: unbondDelay,
 * keyChallengeWindow and challengeBond are copied from the live contract when the batch is written.
 *
 *   bun scripts/set-min-bond.ts batch <usdg>    # writes contracts/deployments/rhc-mainnet-minbond-batch.json
 *   bun scripts/safe-exec.ts rhc-mainnet-minbond-batch.json --yes   # the Safe schedules it
 *   bun scripts/set-min-bond.ts status
 *   bun scripts/set-min-bond.ts execute         # after 48h; POSTER_PRIVATE_KEY pays gas
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, decodeFunctionData, defineChain, encodeFunctionData, http, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const OUT = `${ROOT}contracts/deployments/rhc-mainnet-minbond-batch.json`;
const SALT: Hex = `0x${"0".repeat(64)}`;
const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-mainnet.json`, "utf8"));
const att = parseAbi([
  "function setParams(uint256,uint64,uint64,uint256)",
  "function minBond() view returns (uint256)",
  "function unbondDelay() view returns (uint64)",
  "function keyChallengeWindow() view returns (uint64)",
  "function challengeBond() view returns (uint256)",
]);
const tl = parseAbi([
  "function schedule(address,uint256,bytes,bytes32) returns (bytes32)",
  "function execute(address,uint256,bytes,bytes32) payable",
  "function opId(address,uint256,bytes,bytes32) pure returns (bytes32)",
  "function readyAt(bytes32) view returns (uint64)",
]);
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const read = (functionName: "minBond" | "unbondDelay" | "keyChallengeWindow" | "challengeBond") =>
  pub.readContract({ address: d.attesterRegistry, abi: att, functionName }) as Promise<bigint>;

const [cmd, usdg] = process.argv.slice(2);
if (cmd === "batch") {
  if (!usdg || !(Number(usdg) > 0)) throw new Error("usage: batch <usdg>");
  const [unbondDelay, keyWindow, challengeBond] = await Promise.all([read("unbondDelay"), read("keyChallengeWindow"), read("challengeBond")]);
  const minBond = parseUnits(usdg, 6);
  if (minBond < challengeBond) throw new Error("minBond below challengeBond: a proven fraud could not pay the challenger");
  const call = encodeFunctionData({ abi: att, functionName: "setParams", args: [minBond, unbondDelay, keyWindow, challengeBond] });
  const batch = {
    version: "1.0",
    chainId: "4663",
    createdAt: Date.now(),
    meta: { name: "Bollard min bond", description: `Schedules setParams(minBond ${usdg} USDG, unchanged unbondDelay/keyChallengeWindow/challengeBond) on the 48h timelock.` },
    transactions: [{ to: d.timelock, value: "0", data: encodeFunctionData({ abi: tl, functionName: "schedule", args: [d.attesterRegistry, 0n, call, SALT] }) }],
  };
  writeFileSync(OUT, JSON.stringify(batch, null, 2) + "\n");
  console.log(`wrote ${OUT}: minBond ${usdg} USDG (now ${Number(await read("minBond")) / 1e6})`);
} else if (cmd === "status" || cmd === "execute") {
  const batch = JSON.parse(readFileSync(OUT, "utf8"));
  const { args } = decodeFunctionData({ abi: tl, data: batch.transactions[0].data as Hex });
  const [target, , data] = args as [Address, bigint, Hex, Hex];
  const id = await pub.readContract({ address: d.timelock, abi: tl, functionName: "opId", args: [target, 0n, data, SALT] });
  const ready = await pub.readContract({ address: d.timelock, abi: tl, functionName: "readyAt", args: [id] });
  const now = BigInt(Math.floor(Date.now() / 1000));
  console.log(`setParams: ${ready === 0n ? "not scheduled (or done)" : ready > now ? `ready in ${Math.ceil(Number(ready - now) / 3600)}h (${new Date(Number(ready) * 1000).toISOString()})` : "ready"}; minBond now ${Number(await read("minBond")) / 1e6} USDG`);
  if (cmd === "execute" && ready !== 0n && ready <= now) {
    const env = Object.fromEntries(
      readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
    );
    const wallet = createWalletClient({ chain, transport: http(RPC), account: privateKeyToAccount(env.POSTER_PRIVATE_KEY as Hex) });
    const hash = await wallet.writeContract({ address: d.timelock, abi: tl, functionName: "execute", args: [target, 0n, data, SALT] });
    const r = await pub.waitForTransactionReceipt({ hash });
    console.log(`  executed ${hash} (${r.status}); minBond now ${Number(await read("minBond")) / 1e6} USDG`);
  }
} else {
  throw new Error("usage: batch <usdg> | status | execute");
}
