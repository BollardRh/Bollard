import { createHmac } from "node:crypto";
import { encodeAbiParameters, keccak256, type Hex } from "viem";

/**
 * Keyed PRNG (backend doc §5.4): rng = hmacSha256(seedKey, caseId || seed), extended in counter mode.
 * seedKey = keccak256(abi.encode(requestId, corpusRoot, blockhash(requestBlock + 1))), so nobody can choose
 * the variants before the request lands, and every node derives the same ones.
 */
export function seedKeyOf(requestId: bigint, corpusRoot: Hex, nextBlockHash: Hex): Hex {
  return keccak256(
    encodeAbiParameters([{ type: "uint256" }, { type: "bytes32" }, { type: "bytes32" }], [requestId, corpusRoot, nextBlockHash]),
  );
}

export class Rng {
  private counter = 0;
  private buf = Buffer.alloc(0);
  private readonly key: Buffer;
  private readonly msg: string;

  constructor(seedKey: Hex, caseId: string, seed: number) {
    this.key = Buffer.from(seedKey.slice(2), "hex");
    this.msg = `${caseId}|${seed}`;
  }

  bytes(n: number): Buffer {
    while (this.buf.length < n) {
      const block = createHmac("sha256", this.key).update(`${this.msg}|${this.counter++}`).digest();
      this.buf = Buffer.concat([this.buf, block]);
    }
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return Buffer.from(out);
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    if (n <= 0) throw new Error("Rng.int: n must be positive");
    return this.bytes(4).readUInt32BE(0) % n;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick: empty list");
    return items[this.int(items.length)]!;
  }
}
