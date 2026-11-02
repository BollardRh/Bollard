import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { attesterRegistryAbi, erc20Abi } from "../chain/abis.ts";
import { DEV_CHAINS } from "../attest/devAttestor.ts";
import { Enclave } from "../attest/enclave.ts";

/**
 * DEV ATTESTOR ONLY (Robinhood Chain testnet / local). Conveniences for running harness nodes on a laptop:
 *  - keep the dev enclave key in a local file so restarts do not force re-registration
 *  - let the node bond and register its own key with the testnet attester key
 * Real TDX nodes never persist the enclave key, and the bonded attester EOA stays outside the CVM.
 */

export function devEnclave(chainId: number, file?: string): Enclave {
  if (!DEV_CHAINS.has(chainId)) throw new Error("persistent dev enclave keys are testnet-only");
  if (!file) return Enclave.generate();
  if (!existsSync(file)) writeFileSync(file, generatePrivateKey(), { mode: 0o600 });
  return Enclave.unsafeFromPrivateKey(readFileSync(file, "utf8").trim() as Hex);
}

export async function devSelfRegister(opts: {
  chainId: number;
  rpcUrl: string;
  attesters: Address;
  stakeToken: Address;
  attesterKey: Hex;
  enclave: Enclave;
  quote: Hex;
  composeHash: Hex;
}): Promise<string> {
  if (!DEV_CHAINS.has(opts.chainId)) throw new Error("dev self-registration is testnet-only");
  const chain = defineChain({ id: opts.chainId, name: "dev", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [opts.rpcUrl] } } });
  const pub = createPublicClient({ chain, transport: http(opts.rpcUrl) });
  const account = privateKeyToAccount(opts.attesterKey);
  const wallet = createWalletClient({ chain, transport: http(opts.rpcUrl), account });
  const send = async (address: Address, abi: typeof erc20Abi | typeof attesterRegistryAbi, functionName: string, args: unknown[]) => {
    const hash = await wallet.writeContract({ address, abi, functionName, args } as never);
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`${functionName} reverted`);
  };

  const k = (await pub.readContract({ address: opts.attesters, abi: attesterRegistryAbi, functionName: "keys", args: [opts.enclave.address] })) as readonly unknown[];
  if (k[0] !== "0x0000000000000000000000000000000000000000") return "already registered";

  const minBond = (await pub.readContract({ address: opts.attesters, abi: attesterRegistryAbi, functionName: "minBond" })) as bigint;
  const a = (await pub.readContract({ address: opts.attesters, abi: attesterRegistryAbi, functionName: "attesters", args: [account.address] })) as readonly [bigint, bigint, bigint, boolean];
  if (a[0] < minBond) {
    const need = minBond - a[0];
    await send(opts.stakeToken, erc20Abi, "mint", [account.address, need]); // tBLRD: open mint on testnet
    await send(opts.stakeToken, erc20Abi, "approve", [opts.attesters, need]);
    await send(opts.attesters, attesterRegistryAbi, "bond", [need]);
  }
  await send(opts.attesters, attesterRegistryAbi, "registerEnclaveKey", [opts.enclave.address, opts.quote, opts.composeHash]);
  return "registered";
}
