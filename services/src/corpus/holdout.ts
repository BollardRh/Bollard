import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { toHex, type Hex } from "viem";
import { AttackCase } from "./schema.ts";
import { holdoutCommit, leafOf, merkleRoot } from "./merkle.ts";

/**
 * Encrypted holdout bundle: iv(12) | tag(16) | AES-256-GCM({holdoutRoot, salt, cases}).
 * Only holdoutCommit = keccak256(holdoutRoot || salt) is ever published (doc §6.3).
 */
export interface HoldoutPlain {
  holdoutRoot: Hex;
  salt: Hex;
  cases: AttackCase[];
}

export function encryptHoldout(cases: AttackCase[], key: Buffer, salt: Hex = toHex(randomBytes(32))): { blob: Buffer; commit: Hex; root: Hex } {
  const root = merkleRoot(cases.map(leafOf));
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(JSON.stringify({ holdoutRoot: root, salt, cases } satisfies HoldoutPlain)), c.final()]);
  return { blob: Buffer.concat([iv, c.getAuthTag(), body]), commit: holdoutCommit(root, salt), root };
}

export function decryptHoldout(blob: Buffer, key: Buffer): HoldoutPlain & { commit: Hex } {
  const d = createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  const plain = JSON.parse(Buffer.concat([d.update(blob.subarray(28)), d.final()]).toString("utf8")) as HoldoutPlain;
  const cases = plain.cases.map((c) => AttackCase.parse(c));
  const root = merkleRoot(cases.map(leafOf));
  if (root !== plain.holdoutRoot) throw new Error("holdout bundle root mismatch");
  return { holdoutRoot: root, salt: plain.salt, cases, commit: holdoutCommit(root, plain.salt) };
}
