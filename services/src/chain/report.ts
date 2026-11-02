import { hashTypedData, type Address, type Hex } from "viem";

/** EIP-712 shape of RatingReport. Must match contracts/src/lib/RatingTypes.sol field for field. */
export const RATING_REPORT_TYPES = {
  RatingReport: [
    { name: "agentRegistry", type: "address" },
    { name: "agentId", type: "uint256" },
    { name: "versionHash", type: "bytes32" },
    { name: "requestId", type: "uint256" },
    { name: "corpusRoot", type: "bytes32" },
    { name: "holdoutCommit", type: "bytes32" },
    { name: "runsRoot", type: "bytes32" },
    { name: "seeds", type: "uint16" },
    { name: "score", type: "uint8" },
    { name: "grade", type: "uint8" },
    { name: "testedMask", type: "uint32" },
    { name: "failedMask", type: "uint32" },
    { name: "issuedAt", type: "uint64" },
    { name: "expiresAt", type: "uint64" },
  ],
} as const;

export interface RatingReport {
  agentRegistry: Address;
  agentId: bigint;
  versionHash: Hex;
  requestId: bigint;
  corpusRoot: Hex;
  holdoutCommit: Hex;
  runsRoot: Hex;
  seeds: number;
  score: number;
  grade: number;
  testedMask: number;
  failedMask: number;
  issuedAt: bigint;
  expiresAt: bigint;
}

/** Domain: name "Bollard", version "1", chainId, verifyingContract = RatingRegistry (doc §3.3). */
export function ratingDomain(chainId: number, registry: Address) {
  return { name: "Bollard", version: "1", chainId, verifyingContract: registry } as const;
}

/** Equals RatingRegistry.digestOf(r) on the same chain and registry. */
export function reportDigest(chainId: number, registry: Address, report: RatingReport): Hex {
  return hashTypedData({
    domain: ratingDomain(chainId, registry),
    types: RATING_REPORT_TYPES,
    primaryType: "RatingReport",
    message: report,
  });
}
