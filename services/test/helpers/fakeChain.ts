import { getAddress, type Address, type Hex } from "viem";
import { REQ_OPEN, type NodeChain, type OnchainRequest } from "../../src/node/jobCheck.ts";

/** In-memory NodeChain for unit tests: requests with the block they landed in, block hashes, enclave keys. */
export interface FakeChainState {
  chainId: number;
  ratingRegistry: Address;
  attesterRegistry: Address;
  corpusRoot: Hex;
  requests: Map<bigint, OnchainRequest & { block: bigint }>;
  blocks: Map<bigint, Hex>;
  keys: Map<string, { attester: Address; active: boolean }>;
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export function fakeChain(s: FakeChainState): NodeChain {
  return {
    chainId: s.chainId,
    ratingRegistry: getAddress(s.ratingRegistry),
    attesterRegistry: getAddress(s.attesterRegistry),
    corpusRoot: s.corpusRoot,
    async request(id) {
      const r = s.requests.get(id);
      return r ? { agentRegistry: r.agentRegistry, agentId: r.agentId, versionHash: r.versionHash, status: r.status } : { agentRegistry: ZERO, agentId: 0n, versionHash: `0x${"00".repeat(32)}`, status: 0 };
    },
    // like the RPC implementation: locate the claimed block, then prove RunRequested(id) is in its parent
    async requestBlock(id, claimed) {
      const n = [...s.blocks].find(([, h]) => h.toLowerCase() === claimed.toLowerCase())?.[0];
      if (n === undefined) return null;
      return s.requests.get(id)?.block === n - 1n ? n - 1n : null;
    },
    async blockHash(n) {
      return s.blocks.get(n) ?? null;
    },
    async isActiveKey(k) {
      return s.keys.get(k.toLowerCase())?.active ?? false;
    },
    async attesterOf(k) {
      return s.keys.get(k.toLowerCase())?.attester ?? ZERO;
    },
  };
}

export const openRequest = (r: Omit<OnchainRequest, "status">, block: bigint) => ({ ...r, status: REQ_OPEN, block });
