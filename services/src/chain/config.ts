import { getAddress, isAddress, type Address } from "viem";

/**
 * Chain configuration from env. Robinhood Chain testnet (46630) by default; every value is per chain so a
 * mainnet or Base deployment is a second config, not a code change.
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorer: string;
  confirmations: number;
  startBlock: bigint;
  contracts: {
    ratingRegistry: Address;
    attesterRegistry: Address;
    feeRouter: Address;
    feeToken: Address;
    identity8004: Address;
    arenaBounty?: Address;
    safeRatingGuard?: Address;
  };
}

export const TESTNET_IDENTITY_8004: Address = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const addr = (env: NodeJS.ProcessEnv, k: string, fallback?: Address): Address => {
  const v = env[k] ?? fallback;
  if (!v || !isAddress(v)) throw new Error(`${k} must be an address`);
  return getAddress(v);
};
const optAddr = (env: NodeJS.ProcessEnv, k: string): Address | undefined => (env[k] && isAddress(env[k]!) ? getAddress(env[k]!) : undefined);

export function chainConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ChainConfig {
  const chainId = Number(env.CHAIN_ID ?? 46630);
  return {
    chainId,
    name: env.CHAIN_NAME ?? (chainId === 46630 ? "Robinhood Chain Testnet" : `Chain ${chainId}`),
    rpcUrl: env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com",
    explorer: env.EXPLORER_URL ?? "",
    confirmations: Number(env.CONFIRMATIONS ?? 20),
    startBlock: BigInt(env.START_BLOCK_RHC ?? 0),
    contracts: {
      ratingRegistry: addr(env, "REGISTRY_RHC"),
      attesterRegistry: addr(env, "ATTESTERS_RHC"),
      feeRouter: addr(env, "FEEROUTER_RHC"),
      feeToken: addr(env, "FEE_TOKEN_RHC"),
      identity8004: addr(env, "IDENTITY_8004", TESTNET_IDENTITY_8004),
      arenaBounty: optAddr(env, "ARENA_RHC"),
      safeRatingGuard: optAddr(env, "GUARD_RHC"),
    },
  };
}

/** On-chain RatingRegistry.check codes (contract §3.7). */
export const CHECK_CODES = [
  "OK",
  "NO_RATING",
  "STALE_VERSION",
  "EXPIRED",
  "DISPUTED_OR_VOID",
  "BELOW_FLOOR",
  "FAMILY_FAILED",
  "UNTESTED_FAMILY",
  "SIGNER_SLASHED",
] as const;
