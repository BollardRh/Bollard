import { existsSync, readFileSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

/** Local anvil chain plus the compiled Bollard contracts, for end-to-end tests. */

export const OUT = new URL("../../../contracts/out/", import.meta.url).pathname;
export const localChainReady = () => Boolean(Bun.which("anvil")) && existsSync(`${OUT}RatingRegistry.sol/RatingRegistry.json`);

export const artifact = (file: string, name: string) => {
  const j = JSON.parse(readFileSync(`${OUT}${file}/${name}.json`, "utf8")) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: j.abi, bytecode: j.bytecode.object };
};

// anvil's default dev accounts (well-known public test keys)
export const KEYS: Hex[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
];

export async function startAnvil() {
  const port = 19545 + Math.floor(Math.random() * 1000);
  const rpc = `http://127.0.0.1:${port}`;
  const proc: ChildProcess = spawn("anvil", ["--port", String(port), "--chain-id", "31337", "--silent"], { stdio: "ignore" });
  const pub = createPublicClient({ chain: foundry, transport: http(rpc), pollingInterval: 50 });
  for (let i = 0; i < 100; i++) {
    try {
      await pub.getBlockNumber();
      break;
    } catch {
      await Bun.sleep(100);
    }
  }
  const wallet = (i: number) =>
    createWalletClient({ chain: foundry, transport: http(rpc), account: privateKeyToAccount(KEYS[i]!), pollingInterval: 50 });
  const deploy = async (w: ReturnType<typeof wallet>, a: { abi: Abi; bytecode: Hex }, args: unknown[]): Promise<Address> => {
    const hash = await w.deployContract({ abi: a.abi, bytecode: a.bytecode, args, chain: foundry, account: w.account! });
    return (await pub.waitForTransactionReceipt({ hash })).contractAddress!;
  };
  const send = async (w: ReturnType<typeof wallet>, address: Address, abi: Abi, functionName: string, args: unknown[]) => {
    const hash = await w.writeContract({ address, abi, functionName, args, chain: foundry, account: w.account! });
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${functionName} reverted`);
    return r;
  };
  const mine = (n = 1) => pub.request({ method: "anvil_mine" as never, params: [`0x${n.toString(16)}`] as never });
  return { rpc, pub, wallet, deploy, send, mine, stop: () => proc.kill("SIGKILL") };
}

export type LocalChain = Awaited<ReturnType<typeof startAnvil>>;
