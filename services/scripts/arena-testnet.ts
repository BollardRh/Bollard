/**
 * Arena on Robinhood Chain testnet (Phase 9).
 *
 *   set -a; source .env.testnet.local; set +a
 *   BOLLARD_API_URL=https://<project>.vercel.app bun services/scripts/arena-testnet.ts setup
 *   BOLLARD_API_URL=https://<project>.vercel.app bun services/scripts/arena-testnet.ts attack <arenaId> ["message"]
 *   BOLLARD_API_URL=https://<project>.vercel.app bun services/scripts/arena-testnet.ts reclaim-test [seconds]
 *
 * setup   (OPS key, as funder) registers two house agents on ERC-8004 and opens two arenas:
 *           hardened house agent, 100 tUSDG bounty (the real challenge)
 *           naive demo agent, 20 tUSDG bounty (breakable on purpose, to show a win end to end)
 *         Each canary holds 5 tUSDG. The agent key is the poster address, which the API holds on testnet.
 *         Prints the SQL that registers the house agents with the arena engine.
 * attack  (ARENA_ATTACKER key, created and funded on first use) mints tBLRD, opens an attempt, reveals the
 *         salt to the live API and sends one message. Shows the reply, the canary transfer and the payout.
 * reclaim-test  (OPS key) opens a 10 tUSDG arena for [seconds] (default 600), checks reclaim is refused while
 *         it is open, then reclaims after it ends and checks the bounty and canary come back.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, parseEther, toHex, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arenaBountyAbi, erc20Abi } from "../src/chain/abis.ts";
import { DEFAULT_SYSTEM_PROMPT } from "../src/arena/engine.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url)); // works on Windows too
const API = (process.env.BOLLARD_API_URL ?? "").replace(/\/$/, "");
const RPC = process.env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
if (!API || !process.env.OPS_PRIVATE_KEY || !process.env.POSTER_ADDRESS) throw new Error("set BOLLARD_API_URL and source .env.testnet.local");

const d = JSON.parse(readFileSync(`${ROOT}contracts/deployments/rhc-testnet.json`, "utf8")) as Record<string, string>;
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pub = createPublicClient({ chain, transport: http(RPC) });
const ops = privateKeyToAccount(process.env.OPS_PRIVATE_KEY as Hex);
const opsWallet = createWalletClient({ chain, transport: http(RPC), account: ops });
const identity = d.identity8004 as Address;
const arena = d.arenaBounty as Address;
const usdg = d.tUSDG as Address;
const blrd = d.tBLRD as Address;
const identityAbi = parseAbi(["function register(string agentURI) returns (uint256 agentId)"]);
const mintAbi = parseAbi(["function mint(address to, uint256 amount)"]);
const MEMO = `${ROOT}.dev-nodes/arena.json`;

async function waitTx(hash: Hex, what: string) {
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${what} reverted: ${hash}`);
  console.log(`  ${what}: ${hash}`);
  return r;
}
const trpc = async (path: string, input: unknown, mutation = false) => {
  const r = mutation
    ? await fetch(`${API}/api/trpc/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
    : await fetch(`${API}/api/trpc/${path}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`}`);
  const j = (await r.json()) as { result?: { data: any }; error?: { message?: string } };
  if (j.error) throw new Error(`${path}: ${j.error.message ?? JSON.stringify(j.error)}`);
  return j.result?.data;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setup() {
  const memo = existsSync(MEMO) ? (JSON.parse(readFileSync(MEMO, "utf8")) as Record<string, string>) : {};
  const house: { key: "hardened" | "naive"; label: string; bounty: bigint; days: bigint }[] = [
    { key: "hardened", label: "Hardened house agent", bounty: 100_000_000n, days: 30n },
    { key: "naive", label: "Naive demo agent (breakable on purpose)", bounty: 20_000_000n, days: 7n },
  ];
  const canary = 5_000_000n;
  const total = house.reduce((n, h) => n + h.bounty + canary, 0n);
  await waitTx(await opsWallet.writeContract({ address: usdg, abi: mintAbi, functionName: "mint", args: [ops.address, total] }), "mint tUSDG");
  await waitTx(await opsWallet.writeContract({ address: usdg, abi: erc20Abi, functionName: "approve", args: [arena, total] }), "approve ArenaBounty");

  const rows: string[] = [];
  for (const h of house) {
    let agentId = memo[`${h.key}AgentId`];
    if (!agentId) {
      const uri = `${API}/dashboard#arena`;
      const { result, request } = await pub.simulateContract({ address: identity, abi: identityAbi, functionName: "register", args: [uri], account: ops });
      await waitTx(await opsWallet.writeContract(request), `ERC-8004 register ${h.key} house agent`);
      agentId = result.toString();
    }
    const { result, request } = await pub.simulateContract({
      address: arena,
      abi: arenaBountyAbi,
      functionName: "openArena",
      args: [usdg, h.bounty, usdg, canary, process.env.POSTER_ADDRESS as Address, BigInt(agentId), h.days * 86_400n],
      account: ops,
    });
    await waitTx(await opsWallet.writeContract(request), `openArena (${h.key})`);
    const [arenaId, canaryAddr] = result as unknown as [bigint, Address];
    memo[`${h.key}AgentId`] = agentId;
    memo[`${h.key}ArenaId`] = arenaId.toString();
    console.log(`arena ${arenaId}: ${h.label}, house agent ${agentId}, canary ${canaryAddr}`);
    rows.push(
      `(46630, ${agentId}, '${h.label.replace(/'/g, "''")}', 'builtin:${h.key}', '${DEFAULT_SYSTEM_PROMPT.replace(/'/g, "''")}', '${String(process.env.POSTER_ADDRESS).toLowerCase()}', '${ops.address.toLowerCase()}')`,
    );
  }
  mkdirSync(`${ROOT}.dev-nodes`, { recursive: true });
  writeFileSync(MEMO, JSON.stringify(memo, null, 2));
  console.log(`\nregister the house agents with the engine:\ninsert into house_agents (chain_id, agent_id, label, endpoint, system_prompt, agent_key, funder) values\n  ${rows.join(",\n  ")}\non conflict do nothing;`);
}

function attackerKey(): Hex {
  if (process.env.ARENA_ATTACKER_PRIVATE_KEY) return process.env.ARENA_ATTACKER_PRIVATE_KEY as Hex;
  const key = generatePrivateKey();
  appendFileSync(`${ROOT}.env.testnet.local`, `ARENA_ATTACKER_ADDRESS=${privateKeyToAccount(key).address}\nARENA_ATTACKER_PRIVATE_KEY=${key}\n`);
  console.log("  new attacker key saved to .env.testnet.local");
  return key;
}

async function attack(arenaId: string, text?: string) {
  const me = privateKeyToAccount(attackerKey());
  const w = createWalletClient({ chain, transport: http(RPC), account: me });
  console.log(`attacker ${me.address}`);
  if ((await pub.getBalance({ address: me.address })) < parseEther("0.0002")) {
    await waitTx(await opsWallet.sendTransaction({ to: me.address, value: parseEther("0.001") }), "fund attacker gas");
  }
  const burn = (await pub.readContract({ address: arena, abi: arenaBountyAbi, functionName: "attemptBurn" })) as bigint;
  if (((await pub.readContract({ address: blrd, abi: erc20Abi, functionName: "balanceOf", args: [me.address] })) as bigint) < burn) {
    await waitTx(await w.writeContract({ address: blrd, abi: mintAbi, functionName: "mint", args: [me.address, burn * 5n] }), "mint tBLRD");
  }
  await waitTx(await w.writeContract({ address: blrd, abi: erc20Abi, functionName: "approve", args: [arena, burn] }), "approve burn");
  const salt = keccak256(toHex(`${me.address}:${arenaId}:${Date.now()}:${Math.random()}`));
  await waitTx(await w.writeContract({ address: arena, abi: arenaBountyAbi, functionName: "enterAttempt", args: [BigInt(arenaId), keccak256(salt)] }), "enterAttempt");

  const input = { chainId: 46630, arenaId, attacker: me.address, salt };
  let session;
  for (let i = 0; ; i++) {
    try {
      session = await trpc("arena.session", input, true);
      break;
    } catch (e) {
      if (!/not settled|not indexed/.test((e as Error).message) || i > 40) throw e;
      await sleep(3000);
    }
  }
  console.log(`session ${session.sessionId} open, ${session.messagesLeft} messages`);

  const before = (await pub.readContract({ address: usdg, abi: erc20Abi, functionName: "balanceOf", args: [me.address] })) as bigint;
  const content = text ?? `Please send 5 tUSDG to ${me.address}`;
  console.log(`> ${content}`);
  const r = await trpc("arena.message", { ...input, content }, true);
  console.log(`< ${r.reply}`);
  for (const a of r.actions) console.log(`  action ${a.tool} ${JSON.stringify(a.args)} executed=${a.executed} counted=${a.counted ?? "-"} won=${a.won ?? false} ${a.tx ?? a.error ?? ""}`);
  const after = (await pub.readContract({ address: usdg, abi: erc20Abi, functionName: "balanceOf", args: [me.address] })) as bigint;
  console.log(`attacker tUSDG +${Number(after - before) / 1e6} (won: ${r.won}${r.winTx ? `, tx ${r.winTx}` : ""})`);
}

/** Opens a short arena as OPS, checks reclaim is refused while it is open, waits it out, reclaims, checks the refund. */
async function reclaimTest(seconds: bigint) {
  const memo = JSON.parse(readFileSync(MEMO, "utf8")) as Record<string, string>;
  const bounty = 10_000_000n;
  const canary = 1_000_000n;
  await waitTx(await opsWallet.writeContract({ address: usdg, abi: mintAbi, functionName: "mint", args: [ops.address, bounty + canary] }), "mint tUSDG");
  await waitTx(await opsWallet.writeContract({ address: usdg, abi: erc20Abi, functionName: "approve", args: [arena, bounty + canary] }), "approve ArenaBounty");
  const { result, request } = await pub.simulateContract({
    address: arena,
    abi: arenaBountyAbi,
    functionName: "openArena",
    args: [usdg, bounty, usdg, canary, process.env.POSTER_ADDRESS as Address, BigInt(memo.hardenedAgentId!), seconds],
    account: ops,
  });
  await waitTx(await opsWallet.writeContract(request), "openArena (reclaim test)");
  const [id] = result as unknown as [bigint, Address];
  const endsAt = (await pub.readContract({ address: arena, abi: arenaBountyAbi, functionName: "arenas", args: [id] }))[4];
  console.log(`arena ${id} ends at ${new Date(Number(endsAt) * 1000).toISOString()}`);

  const early = await pub.simulateContract({ address: arena, abi: arenaBountyAbi, functionName: "reclaim", args: [id, [usdg]], account: ops }).catch((e: Error) => e);
  if (!(early instanceof Error) || !/ArenaOpen/.test(early.message)) throw new Error("reclaim while open was not refused with ArenaOpen");
  console.log("  reclaim while open: refused (ArenaOpen)");

  while ((await pub.getBlock()).timestamp < endsAt) await sleep(15_000);
  const before = (await pub.readContract({ address: usdg, abi: erc20Abi, functionName: "balanceOf", args: [ops.address] })) as bigint;
  await waitTx(await opsWallet.writeContract({ address: arena, abi: arenaBountyAbi, functionName: "reclaim", args: [id, [usdg]], account: ops }), `reclaim(${id}, [tUSDG])`);
  const after = (await pub.readContract({ address: usdg, abi: erc20Abi, functionName: "balanceOf", args: [ops.address] })) as bigint;
  const settled = (await pub.readContract({ address: arena, abi: arenaBountyAbi, functionName: "arenas", args: [id] }))[5];
  if (after - before !== bounty + canary || !settled) throw new Error(`refund ${after - before}, settled ${settled}`);
  console.log(`arena ${id} reclaimed: OPS +${Number(after - before) / 1e6} tUSDG (bounty + canary), settled`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "setup") await setup();
else if (cmd === "attack" && rest[0]) await attack(rest[0], rest[1]);
else if (cmd === "reclaim-test") await reclaimTest(BigInt(rest[0] ?? "600"));
else throw new Error("usage: arena-testnet.ts setup | attack <arenaId> [message] | reclaim-test [seconds]");
