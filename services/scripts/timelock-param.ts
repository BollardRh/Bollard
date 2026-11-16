/**
 * Changes one USDG setting through the 48h timelock, copying every other value of the same setter from the
 * live contract when the batch is written.
 *
 *   minbond  AttesterRegistry.setParams  (unbondDelay, keyChallengeWindow, challengeBond unchanged)
 *   runfee   RatingRegistry.setParams    (every other rating param unchanged)
 *
 *   bun scripts/timelock-param.ts <minbond|runfee> batch <usdg>   # writes contracts/deployments/rhc-mainnet-<kind>-batch.json
 *   bun scripts/safe-exec.ts rhc-mainnet-<kind>-batch.json --yes  # the Safe schedules it
 *   bun scripts/timelock-param.ts <minbond|runfee> status
 *   bun scripts/timelock-param.ts <minbond|runfee> execute        # after 48h; POSTER_PRIVATE_KEY pays gas
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, decodeFunctionData, defineChain, encodeFunctionData, http, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const RPC = "https://rpc.mainnet.chain.robinhood.com";
const SALT: Hex = `0x${"0".repeat(64)}`;
const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-mainnet.json`, "utf8"));
const att = parseAbi([
  "function setParams(uint256,uint64,uint64,uint256)",
  "function minBond() view returns (uint256)",
  "function unbondDelay() view returns (uint64)",
  "function keyChallengeWindow() view returns (uint64)",
  "function challengeBond() view returns (uint256)",
]);
const PARAMS = "(uint8 quorum,uint16 minSeeds,uint8 scoreTolerance,uint32 criticalMask,uint32 requiredTestedMask,uint64 maxTtl,uint64 maxReportAge,uint64 disputeWindow,uint64 tiebreakWindow,uint64 requestTtl,uint256 runFee,uint256 disputeSlashAmount)";
const reg = parseAbi([
  `function setParams(${PARAMS} p)`,
  "function params() view returns (uint8,uint16,uint8,uint32,uint32,uint64,uint64,uint64,uint64,uint64,uint256,uint256)",
]);
const tl = parseAbi([
  "function schedule(address,uint256,bytes,bytes32) returns (bytes32)",
  "function execute(address,uint256,bytes,bytes32) payable",
  "function opId(address,uint256,bytes,bytes32) pure returns (bytes32)",
  "function readyAt(bytes32) view returns (uint64)",
]);
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const readAtt = (functionName: "minBond" | "unbondDelay" | "keyChallengeWindow" | "challengeBond") =>
  pub.readContract({ address: d.attesterRegistry, abi: att, functionName }) as Promise<bigint>;
const readRun = async () => {
  const p = await pub.readContract({ address: d.ratingRegistry, abi: reg, functionName: "params" });
  const k = ["quorum", "minSeeds", "scoreTolerance", "criticalMask", "requiredTestedMask", "maxTtl", "maxReportAge", "disputeWindow", "tiebreakWindow", "requestTtl", "runFee", "disputeSlashAmount"] as const;
  return Object.fromEntries(k.map((n, i) => [n, p[i]])) as Record<(typeof k)[number], number | bigint>;
};

const KINDS = {
  minbond: {
    target: d.attesterRegistry as Address,
    current: async () => readAtt("minBond"),
    call: async (v: bigint) => {
      const [unbondDelay, keyWindow, challengeBond] = await Promise.all([readAtt("unbondDelay"), readAtt("keyChallengeWindow"), readAtt("challengeBond")]);
      if (v < challengeBond) throw new Error("minBond below challengeBond: a proven fraud could not pay the challenger");
      return encodeFunctionData({ abi: att, functionName: "setParams", args: [v, unbondDelay, keyWindow, challengeBond] });
    },
  },
  runfee: {
    target: d.ratingRegistry as Address,
    current: async () => (await readRun()).runFee as bigint,
    call: async (v: bigint) => encodeFunctionData({ abi: reg, functionName: "setParams", args: [{ ...(await readRun()), runFee: v } as never] }),
  },
};

const [kind, cmd, usdg] = process.argv.slice(2);
const k = KINDS[kind as keyof typeof KINDS];
if (!k) throw new Error("usage: <minbond|runfee> <batch <usdg>|status|execute>");
const OUT = `${ROOT}contracts/deployments/rhc-mainnet-${kind}-batch.json`;
const fmt = async () => Number(await k.current()) / 1e6;

if (cmd === "batch") {
  if (!usdg || !(Number(usdg) > 0)) throw new Error("usage: batch <usdg>");
  const call = await k.call(parseUnits(usdg, 6));
  const batch = {
    version: "1.0",
    chainId: "4663",
    createdAt: Date.now(),
    meta: { name: `Bollard ${kind}`, description: `Schedules ${kind} = ${usdg} USDG (all other values unchanged) on the 48h timelock.` },
    transactions: [{ to: d.timelock, value: "0", data: encodeFunctionData({ abi: tl, functionName: "schedule", args: [k.target, 0n, call, SALT] }) }],
  };
  writeFileSync(OUT, JSON.stringify(batch, null, 2) + "\n");
  console.log(`wrote ${OUT}: ${kind} ${usdg} USDG (now ${await fmt()})`);
} else if (cmd === "status" || cmd === "execute") {
  const batch = JSON.parse(readFileSync(OUT, "utf8"));
  const { args } = decodeFunctionData({ abi: tl, data: batch.transactions[0].data as Hex });
  const [target, , data] = args as [Address, bigint, Hex, Hex];
  const id = await pub.readContract({ address: d.timelock, abi: tl, functionName: "opId", args: [target, 0n, data, SALT] });
  const ready = await pub.readContract({ address: d.timelock, abi: tl, functionName: "readyAt", args: [id] });
  const now = BigInt(Math.floor(Date.now() / 1000));
  console.log(`${kind}: ${ready === 0n ? "not scheduled (or done)" : ready > now ? `ready in ${Math.ceil(Number(ready - now) / 3600)}h (${new Date(Number(ready) * 1000).toISOString()})` : "ready"}; now ${await fmt()} USDG`);
  if (cmd === "execute" && ready !== 0n && ready <= now) {
    const env = Object.fromEntries(
      readFileSync(`${ROOT}.env.mainnet.local`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.trim().split("=") as [string, string]),
    );
    const wallet = createWalletClient({ chain, transport: http(RPC), account: privateKeyToAccount(env.POSTER_PRIVATE_KEY as Hex) });
    const hash = await wallet.writeContract({ address: d.timelock, abi: tl, functionName: "execute", args: [target, 0n, data, SALT] });
    const r = await pub.waitForTransactionReceipt({ hash });
    console.log(`  executed ${hash} (${r.status}); now ${await fmt()} USDG`);
  }
} else {
  throw new Error("usage: <minbond|runfee> <batch <usdg>|status|execute>");
}
