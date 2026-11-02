import { concat, keccak256, toBytes, type Hex } from "viem";
import { canonicalJson } from "./canonical.ts";

/**
 * Keccak Merkle tree with sorted pairs (backend doc §5.5): parent = keccak256(min(a,b) || max(a,b)).
 * Leaves are sorted before building, so the root does not depend on input order.
 * An odd node at the end of a level is carried up unchanged.
 */

export function leafOf(value: unknown): Hex {
  return keccak256(toBytes(canonicalJson(value)));
}

function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) <= BigInt(b) ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

function sortLeaves(leaves: readonly Hex[]): Hex[] {
  return [...leaves].map((l) => l.toLowerCase() as Hex).sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
}

export function merkleRoot(leaves: readonly Hex[]): Hex {
  if (leaves.length === 0) throw new Error("merkleRoot: no leaves");
  let level = sortLeaves(leaves);
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]!;
      const b = level[i + 1];
      next.push(b === undefined ? a : hashPair(a, b));
    }
    level = next;
  }
  return level[0]!;
}

export function merkleProof(leaves: readonly Hex[], leaf: Hex): Hex[] {
  let level = sortLeaves(leaves);
  let idx = level.indexOf(leaf.toLowerCase() as Hex);
  if (idx < 0) throw new Error("merkleProof: leaf not in tree");
  const proof: Hex[] = [];
  while (level.length > 1) {
    const sib = idx % 2 === 0 ? level[idx + 1] : level[idx - 1];
    if (sib !== undefined) proof.push(sib);
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]!;
      const b = level[i + 1];
      next.push(b === undefined ? a : hashPair(a, b));
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyProof(root: Hex, leaf: Hex, proof: readonly Hex[]): boolean {
  let h = leaf.toLowerCase() as Hex;
  for (const p of proof) h = hashPair(h, p);
  return h === root.toLowerCase();
}

/** holdoutCommit = keccak256(holdoutRoot || salt), published on-chain with the corpus (doc §6.3). */
export function holdoutCommit(holdoutRoot: Hex, salt: Hex): Hex {
  return keccak256(concat([holdoutRoot, salt]));
}
