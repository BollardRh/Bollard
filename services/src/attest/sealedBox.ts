import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes, type Hex } from "viem";

/**
 * ECIES over secp256k1 for holdout material (doc §5.7 step 2: "holdout part encrypted to the co-signers'
 * enclave keys"). Only the enclave holding the matching private key can open it.
 *   blob = ephemeralPubKey(33) | iv(12) | tag(16) | ciphertext
 *   key  = SHA-256("BOLLARD-SEAL-V1" || ECDH(eph, recipient).x)
 */
const DOMAIN = Buffer.from("BOLLARD-SEAL-V1");

function kdf(shared: Uint8Array): Buffer {
  return createHash("sha256").update(DOMAIN).update(shared.slice(1)).digest();
}

export function seal(recipientPublicKey: Hex, plaintext: Uint8Array | string): Hex {
  const eph = secp256k1.utils.randomPrivateKey();
  const ephPub = secp256k1.getPublicKey(eph, true);
  const key = kdf(secp256k1.getSharedSecret(eph, hexToBytes(recipientPublicKey), true));
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(ephPub);
  const body = Buffer.concat([c.update(typeof plaintext === "string" ? Buffer.from(plaintext) : plaintext), c.final()]);
  return bytesToHex(Buffer.concat([ephPub, iv, c.getAuthTag(), body]));
}

export function open(privateKey: Hex, blob: Hex): Buffer {
  const b = Buffer.from(hexToBytes(blob));
  if (b.length < 33 + 12 + 16) throw new Error("sealed blob too short");
  const ephPub = b.subarray(0, 33);
  const iv = b.subarray(33, 45);
  const tag = b.subarray(45, 61);
  const key = kdf(secp256k1.getSharedSecret(hexToBytes(privateKey), ephPub, true));
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(ephPub);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(b.subarray(61)), d.final()]);
}
