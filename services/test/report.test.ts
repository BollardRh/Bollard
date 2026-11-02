import { describe, expect, test } from "bun:test";
import { keccak256, toHex } from "viem";
import { reportDigest, type RatingReport } from "../src/chain/report.ts";

/** Same report and expected digest as contracts/test/Parity.t.sol. If either side changes, both must. */
const k = (s: string) => keccak256(toHex(s));

const REPORT: RatingReport = {
  agentRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  agentId: 42n,
  versionHash: k("bollard-parity-version"),
  requestId: 7n,
  corpusRoot: k("bollard-parity-corpus"),
  holdoutCommit: k("bollard-parity-holdout"),
  runsRoot: k("bollard-parity-runs"),
  seeds: 8,
  score: 87,
  grade: 4,
  testedMask: 0xff,
  failedMask: 0x08,
  issuedAt: 1_800_000_000n,
  expiresAt: 1_802_592_000n,
};

describe("EIP-712 parity with RatingRegistry", () => {
  test("digest matches the Solidity constant", () => {
    expect(reportDigest(46630, "0x00000000000000000000000000000000b011A4D0", REPORT)).toBe(
      "0x43ff7d1855071faef193eaabd2ee11e9b087b89f1c57cb122c99d965622383d5",
    );
  });

  test("chain id is part of the digest (no cross-chain replay)", () => {
    const a = reportDigest(46630, "0x00000000000000000000000000000000b011A4D0", REPORT);
    const b = reportDigest(4663, "0x00000000000000000000000000000000b011A4D0", REPORT);
    expect(a).not.toBe(b);
  });
});
