import { type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, sign } from "viem/accounts";
import type { DstackEvent } from "./rtmr.ts";
import { open } from "./sealedBox.ts";
import { reportData } from "./tdx.ts";

/**
 * The enclave signing key (doc §4.2). It is generated inside the CVM, held in memory only, and never
 * exported: this class exposes signing, decryption and the address/public key, not the private key.
 */
export class Enclave {
  readonly #pk: Hex;
  readonly address: Address;
  readonly publicKey: Hex;

  private constructor(pk: Hex) {
    this.#pk = pk;
    const acct = privateKeyToAccount(pk);
    this.address = acct.address;
    this.publicKey = acct.publicKey;
  }

  /** Fresh key, as on CVM boot. */
  static generate(): Enclave {
    return new Enclave(generatePrivateKey());
  }

  /** Deterministic key for tests and the local dev network only. */
  static unsafeFromPrivateKey(pk: Hex): Enclave {
    return new Enclave(pk);
  }

  /** Raw secp256k1 signature over a 32-byte digest (EIP-712 reports). 65 bytes, low-s, v in {27,28}. */
  signDigest(digest: Hex): Promise<Hex> {
    return sign({ hash: digest, privateKey: this.#pk, to: "hex" });
  }

  /** EIP-191 signature (bundle hashes, node API requests). */
  signMessage(message: string | { raw: Hex }): Promise<Hex> {
    return privateKeyToAccount(this.#pk).signMessage({ message });
  }

  /** Opens a blob sealed to this enclave's public key. */
  open(blob: Hex): Buffer {
    return open(this.#pk, blob);
  }

  reportData(chainId: number, registry: Address, composeHash: Hex): Hex {
    return reportData(chainId, registry, this.address, composeHash);
  }

  /**
   * Asks the dstack guest agent for a TDX quote over REPORTDATA (doc §4.2). dstack SDK >= 0.5 serves
   * POST /GetQuote on /var/run/dstack.sock. Older images expose tappd instead; set DSTACK_SOCKET and
   * DSTACK_QUOTE_PATH to match (OPEN ITEM: confirm against the deployed dstack version).
   */
  async quote(chainId: number, registry: Address, composeHash: Hex): Promise<{ quote: Hex; eventLog: DstackEvent[] }> {
    const rd = this.reportData(chainId, registry, composeHash);
    const res = await fetch(`http://localhost${process.env.DSTACK_QUOTE_PATH ?? "/GetQuote"}`, {
      method: "POST",
      unix: process.env.DSTACK_SOCKET ?? "/var/run/dstack.sock",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report_data: rd.slice(2) }),
    } as RequestInit & { unix: string });
    if (!res.ok) throw new Error(`dstack GetQuote failed: ${res.status}`);
    const j = (await res.json()) as { quote: string; event_log: string };
    return { quote: `0x${j.quote.replace(/^0x/, "")}`, eventLog: JSON.parse(j.event_log) as DstackEvent[] };
  }
}
