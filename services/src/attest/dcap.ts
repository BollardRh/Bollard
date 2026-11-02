import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bytesToHex } from "viem";
import { DEV_CHAINS, isDevQuote } from "./devAttestor.ts";

/**
 * Pluggable DCAP verifiers (doc §4.2): they check the quote's Intel signature chain and TCB status.
 *   phala  POST https://cloud-api.phala.com/api/v1/attestations/verify {hex} -> result.quote.verified
 *   local  runs the dcap-qvl CLI with Intel PCS collateral
 *   dev    accepts only dev-attestor quotes, and only on testnet / local chains
 */
export interface DcapVerifier {
  readonly name: string;
  verify(quote: Uint8Array): Promise<boolean>;
}

export const PHALA_VERIFY_URL = "https://cloud-api.phala.com/api/v1/attestations/verify";

export class PhalaCloudVerifier implements DcapVerifier {
  readonly name = "phala";
  constructor(
    private readonly url = process.env.PHALA_VERIFY_URL ?? PHALA_VERIFY_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(quote: Uint8Array): Promise<boolean> {
    try {
      const r = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hex: bytesToHex(quote).slice(2) }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!r.ok) return false;
      const j = (await r.json()) as { quote?: { verified?: boolean } };
      return j?.quote?.verified === true;
    } catch {
      return false;
    }
  }
}

/**
 * Local verification with the dcap-qvl CLI. The command is configurable because the CLI's arguments differ
 * between releases (OPEN ITEM: confirm against the installed version). Exit code 0 means verified.
 */
export class LocalDcapQv1 implements DcapVerifier {
  readonly name = "local";
  constructor(private readonly command = (process.env.DCAP_QVL_CMD ?? "dcap-qvl verify").split(" ")) {}

  async verify(quote: Uint8Array): Promise<boolean> {
    const dir = mkdtempSync(join(tmpdir(), "bollard-quote-"));
    const file = join(dir, "quote.bin");
    writeFileSync(file, quote);
    try {
      return await new Promise<boolean>((resolve) => {
        const [cmd, ...args] = this.command;
        const p = spawn(cmd!, [...args, file], { stdio: "ignore" });
        const timer = setTimeout(() => p.kill("SIGKILL"), 60_000);
        p.on("error", () => resolve(false));
        p.on("exit", (code) => {
          clearTimeout(timer);
          resolve(code === 0);
        });
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** UNSAFE: accepts dev-attestor quotes only. Refuses to exist on any chain but testnet / local. */
export class DevDcapVerifier implements DcapVerifier {
  readonly name = "dev";
  constructor(chainId: number) {
    if (!DEV_CHAINS.has(chainId)) throw new Error(`dev DCAP verifier refused on chain ${chainId}`);
  }

  async verify(quote: Uint8Array): Promise<boolean> {
    return isDevQuote(quote);
  }
}

export function dcapFromEnv(chainId: number, kind = process.env.DCAP_VERIFIER ?? "phala"): DcapVerifier {
  switch (kind) {
    case "phala":
      return new PhalaCloudVerifier();
    case "local":
      return new LocalDcapQv1();
    case "dev":
      return new DevDcapVerifier(chainId);
    default:
      throw new Error(`unknown DCAP_VERIFIER ${kind}`);
  }
}
