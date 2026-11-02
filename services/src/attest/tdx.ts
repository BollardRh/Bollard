import { concat, encodeAbiParameters, keccak256, toHex, type Address, type Hex } from "viem";

/**
 * Intel TDX DCAP quote v4 fields (backend doc §4.1). Mirror of contracts/src/lib/TdxQuote.sol: it extracts
 * what the quote claims and never checks the signature chain; that is the DCAP verifier's job.
 *
 *   header version (u16 LE)      0..2      must be 4
 *   tee type (u32 LE)            4..8      must be 0x81 (TDX)
 *   MRTD, RTMR0, RTMR1, RTMR2    184..232, 376..424, 424..472, 472..520
 *   RTMR3                        520..568  replayed off-chain from the dstack event log
 *   REPORTDATA[0:32]             568..600  enclave key binding
 *   REPORTDATA[32:64]            600..632  dstack compose hash of the harness image
 */

export const TDX_MIN_LEN = 632;
export const TEE_TYPE_TDX = 0x81;

export const OFFSETS = {
  mrtd: 184,
  rtmr0: 376,
  rtmr1: 424,
  rtmr2: 472,
  rtmr3: 520,
  reportData: 568,
} as const;

export interface TdxFields {
  version: number;
  teeType: number;
  mrtd: Uint8Array;
  rtmr0: Uint8Array;
  rtmr1: Uint8Array;
  rtmr2: Uint8Array;
  rtmr3: Uint8Array;
  reportData: Uint8Array; // 64 bytes
}

export function parseTdxV4(q: Uint8Array): TdxFields {
  if (q.length < TDX_MIN_LEN) throw new Error("quote too short");
  const version = q[0]! | (q[1]! << 8);
  const teeType = (q[4]! | (q[5]! << 8) | (q[6]! << 16) | (q[7]! << 24)) >>> 0;
  if (version !== 4 || teeType !== TEE_TYPE_TDX) throw new Error("not a TDX v4 quote");
  const s = (a: number, b: number) => q.slice(a, b);
  return {
    version,
    teeType,
    mrtd: s(184, 232),
    rtmr0: s(376, 424),
    rtmr1: s(424, 472),
    rtmr2: s(472, 520),
    rtmr3: s(520, 568),
    reportData: s(568, 632),
  };
}

/** keccak256(MRTD || RTMR0 || RTMR1 || RTMR2): the OS image measurement governance allowlists. */
export function osMeasurement(f: Pick<TdxFields, "mrtd" | "rtmr0" | "rtmr1" | "rtmr2">): Hex {
  return keccak256(concat([f.mrtd, f.rtmr0, f.rtmr1, f.rtmr2]));
}

export function rtmr3Hash(f: Pick<TdxFields, "rtmr3">): Hex {
  return keccak256(f.rtmr3);
}

/** REPORTDATA[0:32] for `key`: keccak256(abi.encode(keccak256("BOLLARD-ENCLAVE-V1"), chainId, registry, key)). */
export function keyBinding(chainId: bigint | number, registry: Address, key: Address): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "address" }],
      [keccak256(toHex("BOLLARD-ENCLAVE-V1")), BigInt(chainId), registry, key],
    ),
  );
}

/** The 64 bytes the enclave asks dstack to put in REPORTDATA (doc §4.2). */
export function reportData(chainId: bigint | number, registry: Address, key: Address, composeHash: Hex): Hex {
  return concat([keyBinding(chainId, registry, key), composeHash]);
}
