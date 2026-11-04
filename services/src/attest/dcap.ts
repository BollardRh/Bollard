import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bytesToHex } from "viem";
import { DEV_CHAINS, isDevQuote } from "./devAttestor.ts";

/**
 * Pluggable DCAP verifiers (doc §4.2): they check the quote's Intel signature chain and TCB status.
 *   phala  POST https://cloud-api.phala.com/api/v1/attestations/verify {hex} -> quote.verified, plus a TCB
 *          status this file computes from the Intel collateral the response carries (see evaluateTdxTcb)
 *   local  runs the dcap-qvl CLI with Intel PCS collateral
 *   dev    accepts only dev-attestor quotes, and only on testnet / local chains
 */
export interface DcapVerifier {
  readonly name: string;
  verify(quote: Uint8Array): Promise<boolean>;
  /** Same verdict as verify(), with a reason when it is a rejection. Optional. */
  check?(quote: Uint8Array): Promise<DcapResult>;
}

export interface DcapResult {
  ok: boolean;
  detail?: string;
  tcbStatus?: TcbStatus;
}

/** The verifier could not give an answer (network error, 5xx, timeout). Retry later; it is not a rejection. */
export class DcapUnavailableError extends Error {}

export const PHALA_VERIFY_URL = "https://cloud-api.phala.com/api/v1/attestations/verify";

/* ------------------------------------------------------------------------------------------------------ */
/* TCB status                                                                                              */
/* ------------------------------------------------------------------------------------------------------ */

/**
 * Intel TCB statuses (TCB Info v3 / QE Identity v2). Phala's verify response has no TCB status field: its
 * documented schema is { success, quote: { header, body, cert_data, verified }, checksum, quote_collateral,
 * ... } (docs.phala.com/api-reference/attestations/verify-tee-quote), and `verified` alone does not say
 * whether the platform is up to date. So the status is computed here from the quote and the Intel
 * collateral in `quote_collateral` (tcb_info, qe_identity), following Phala-Network/dcap-qvl
 * src/verify.rs (match_platform_tcb, evaluate_tdx_tcb, match_qe_tcb_level) and src/tcb_info.rs.
 */
export type TcbStatus =
  | "UpToDate"
  | "SWHardeningNeeded"
  | "ConfigurationNeeded"
  | "ConfigurationAndSWHardeningNeeded"
  | "OutOfDate"
  | "OutOfDateConfigurationNeeded"
  | "Revoked";

const ALL_STATUSES: readonly TcbStatus[] = [
  "UpToDate",
  "SWHardeningNeeded",
  "ConfigurationNeeded",
  "ConfigurationAndSWHardeningNeeded",
  "OutOfDate",
  "OutOfDateConfigurationNeeded",
  "Revoked",
];

/**
 * Accepted by default: UpToDate, and SWHardeningNeeded (the platform is patched; the open advisories need
 * software mitigations in the TD, which is the dstack OS image the OS allowlist pins).
 * Refused by default: ConfigurationNeeded and ConfigurationAndSWHardeningNeeded (the BIOS/platform
 * configuration is outside Intel's recommended settings, e.g. memory integrity off), which an operator may
 * opt into with PHALA_TCB_ACCEPT. OutOfDate, OutOfDateConfigurationNeeded and Revoked are never accepted:
 * the platform is missing security patches.
 */
export const DEFAULT_ACCEPTED_TCB: ReadonlySet<TcbStatus> = new Set(["UpToDate", "SWHardeningNeeded"]);
const CONFIGURABLE_TCB: ReadonlySet<TcbStatus> = new Set([
  "UpToDate",
  "SWHardeningNeeded",
  "ConfigurationNeeded",
  "ConfigurationAndSWHardeningNeeded",
]);

/** Parses PHALA_TCB_ACCEPT ("UpToDate,SWHardeningNeeded,..."); out-of-date and revoked statuses are refused. */
export function acceptedTcbFrom(list: string | undefined): ReadonlySet<TcbStatus> {
  if (!list?.trim()) return DEFAULT_ACCEPTED_TCB;
  const out = new Set<TcbStatus>();
  for (const raw of list.split(",")) {
    const s = raw.trim() as TcbStatus;
    if (!s) continue;
    if (!CONFIGURABLE_TCB.has(s)) throw new Error(`PHALA_TCB_ACCEPT: ${raw.trim()} cannot be accepted`);
    out.add(s);
  }
  return out;
}

/** A definite rejection while evaluating the TCB (as opposed to a malformed verifier response). */
export class TcbRejection extends Error {}

interface TcbComponents {
  svn: number;
}
interface TcbLevel {
  tcb: { sgxtcbcomponents: TcbComponents[]; tdxtcbcomponents?: TcbComponents[]; pcesvn: number };
  tcbDate?: string;
  tcbStatus: TcbStatus;
  advisoryIDs?: string[];
}
interface TdxModuleIdentity {
  id: string;
  mrsigner: string;
  attributes: string;
  attributesMask: string;
  tcbLevels: { tcb: { isvsvn: number }; tcbStatus: TcbStatus; advisoryIDs?: string[] }[];
}
export interface TdxTcbInfo {
  id: string;
  version: number;
  fmspc: string;
  tcbLevels: TcbLevel[];
  tdxModule?: { mrsigner: string; attributes: string; attributesMask: string };
  tdxModuleIdentities?: TdxModuleIdentity[];
}
export interface QeIdentity {
  id: string;
  tcbLevels: { tcb: { isvsvn: number }; tcbStatus: TcbStatus; advisoryIDs?: string[] }[];
}

/** Parts of a TDX v4 quote the TCB evaluation needs, read from the quote bytes (not from the verifier). */
export interface QuoteTcbInputs {
  teeTcbSvn: Uint8Array; // 16
  mrSignerSeam: Uint8Array; // 48
  seamAttributes: Uint8Array; // 8
  qeIsvSvn: number;
  cpuSvn: Uint8Array; // 16, from the PCK certificate
  pceSvn: number;
  fmspc: string; // hex upper
}

/* Minimal DER walker, just enough for the Intel SGX extension of a PCK certificate. */
interface Tlv {
  tag: number;
  start: number; // content start
  end: number; // content end
}
function tlv(b: Uint8Array, off: number): Tlv {
  if (off + 2 > b.length) throw new TcbRejection("truncated DER");
  const tag = b[off]!;
  let len = b[off + 1]!;
  let p = off + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new TcbRejection("unsupported DER length");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p + i]!;
    p += n;
  }
  if (p + len > b.length) throw new TcbRejection("truncated DER");
  return { tag, start: p, end: p + len };
}
function children(b: Uint8Array, t: Tlv): Tlv[] {
  const out: Tlv[] = [];
  for (let p = t.start; p < t.end; ) {
    const c = tlv(b, p);
    out.push(c);
    p = c.end;
  }
  return out;
}
function oidBytes(oid: string): string {
  const parts = oid.split(".").map(Number);
  const out = [parts[0]! * 40 + parts[1]!];
  for (const n of parts.slice(2)) {
    const enc = [n & 0x7f];
    for (let v = Math.floor(n / 128); v > 0; v = Math.floor(v / 128)) enc.unshift((v & 0x7f) | 0x80);
    out.push(...enc);
  }
  return Buffer.from(out).toString("hex");
}
const SGX_EXT = "1.2.840.113741.1.13.1";
/** In a SEQUENCE of SEQUENCE { OID, value }, the value for `oid`. */
function seqValue(b: Uint8Array, seq: Tlv, oid: string): Tlv | undefined {
  const want = oidBytes(oid);
  for (const item of children(b, seq)) {
    const [k, v] = children(b, item);
    if (k && v && k.tag === 0x06 && Buffer.from(b.subarray(k.start, k.end)).toString("hex") === want) return v;
  }
  return undefined;
}

function pckFields(certDer: Uint8Array): { cpuSvn: Uint8Array; pceSvn: number; fmspc: string } {
  const cert = tlv(certDer, 0);
  const tbs = children(certDer, cert)[0];
  if (!tbs) throw new TcbRejection("PCK certificate has no tbsCertificate");
  const extsWrap = children(certDer, tbs).find((c) => c.tag === 0xa3);
  if (!extsWrap) throw new TcbRejection("PCK certificate has no extensions");
  const exts = children(certDer, extsWrap)[0]!;
  const want = oidBytes(SGX_EXT);
  for (const ext of children(certDer, exts)) {
    const parts = children(certDer, ext);
    const id = parts[0]!;
    if (Buffer.from(certDer.subarray(id.start, id.end)).toString("hex") !== want) continue;
    const octets = parts[parts.length - 1]!;
    const sgx = tlv(certDer, octets.start);
    const tcb = seqValue(certDer, sgx, `${SGX_EXT}.2`);
    const fmspc = seqValue(certDer, sgx, `${SGX_EXT}.4`);
    if (!tcb || !fmspc) throw new TcbRejection("PCK SGX extension lacks TCB or FMSPC");
    const cpu = seqValue(certDer, tcb, `${SGX_EXT}.2.18`);
    const pce = seqValue(certDer, tcb, `${SGX_EXT}.2.17`);
    if (!cpu || !pce || cpu.end - cpu.start !== 16 || fmspc.end - fmspc.start !== 6) throw new TcbRejection("PCK SGX extension is malformed");
    let pceSvn = 0;
    for (let i = pce.start; i < pce.end; i++) pceSvn = pceSvn * 256 + certDer[i]!;
    return {
      cpuSvn: certDer.slice(cpu.start, cpu.end),
      pceSvn,
      fmspc: Buffer.from(certDer.subarray(fmspc.start, fmspc.end)).toString("hex").toUpperCase(),
    };
  }
  throw new TcbRejection("PCK certificate has no Intel SGX extension");
}

/**
 * Reads the TCB inputs from a TDX v4 quote: TEE_TCB_SVN, MRSIGNERSEAM and SEAMATTRIBUTES from the TD report,
 * the QE report's ISVSVN, and CPUSVN / PCESVN / FMSPC from the PCK leaf certificate in certification data
 * type 6 -> type 5 (PEM chain).
 */
export function quoteTcbInputs(q: Uint8Array): QuoteTcbInputs {
  const dv = new DataView(q.buffer, q.byteOffset, q.byteLength);
  if (q.length < 636) throw new TcbRejection("quote has no signature data");
  if (dv.getUint16(0, true) !== 4 || dv.getUint32(4, true) !== 0x81) throw new TcbRejection("not a TDX v4 quote");
  const sigLen = dv.getUint32(632, true);
  const sigEnd = 636 + sigLen;
  if (sigEnd > q.length) throw new TcbRejection("quote signature data is truncated");
  let p = 636 + 64 + 64; // ECDSA signature, attestation public key
  const need = (n: number) => {
    if (p + n > sigEnd) throw new TcbRejection("quote certification data is truncated");
  };
  need(6);
  if (dv.getUint16(p, true) !== 6) throw new TcbRejection("quote certification data is not QE report data (type 6)");
  p += 6;
  need(384 + 64 + 2);
  const qeReport = q.subarray(p, p + 384);
  const qeIsvSvn = qeReport[258]! | (qeReport[259]! << 8);
  p += 384 + 64;
  const authLen = dv.getUint16(p, true);
  p += 2 + authLen;
  need(6);
  if (dv.getUint16(p, true) !== 5) throw new TcbRejection("quote does not carry a PCK certificate chain (type 5)");
  const chainLen = dv.getUint32(p + 2, true);
  p += 6;
  need(chainLen);
  const pem = Buffer.from(q.subarray(p, p + chainLen)).toString("utf8");
  const m = /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/.exec(pem);
  if (!m) throw new TcbRejection("quote PCK certificate chain is not PEM");
  const pck = pckFields(new Uint8Array(Buffer.from(m[1]!.replace(/\s+/g, ""), "base64")));
  return {
    teeTcbSvn: q.slice(48, 64),
    mrSignerSeam: q.slice(112, 160),
    seamAttributes: q.slice(160, 168),
    qeIsvSvn,
    ...pck,
  };
}

/** Intel QVL convergeTcbStatuses: only an OutOfDate or Revoked component changes the platform status. */
function converge(platform: TcbStatus, component: TcbStatus): TcbStatus {
  if (component === "Revoked") return "Revoked";
  if (component === "OutOfDate") {
    if (platform === "UpToDate" || platform === "SWHardeningNeeded") return "OutOfDate";
    if (platform === "ConfigurationNeeded" || platform === "ConfigurationAndSWHardeningNeeded") return "OutOfDateConfigurationNeeded";
  }
  return platform;
}

function lexDesc(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (b[i] ?? -1) - (a[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

const svns = (c: TcbComponents[] | undefined) => (c ?? []).map((x) => x.svn);
const hexEq = (a: Uint8Array, hex: string) => Buffer.from(a).toString("hex").toLowerCase() === hex.toLowerCase();

/**
 * TDX TCB status of a quote's platform, TDX module and QE, the way dcap-qvl / Intel QVL compute it.
 * Throws TcbRejection when no TCB level matches or the module identity does not match.
 */
export function evaluateTdxTcb(input: QuoteTcbInputs, tcbInfo: TdxTcbInfo, qeIdentity: QeIdentity): { status: TcbStatus; advisoryIds: string[] } {
  if (tcbInfo.id !== "TDX" || !(tcbInfo.version >= 3)) throw new TcbRejection("collateral TCB info is not TDX TCB info v3");
  if (String(tcbInfo.fmspc).toUpperCase() !== input.fmspc) throw new TcbRejection("FMSPC mismatch between PCK certificate and TCB info");
  if (qeIdentity.id !== "TD_QE") throw new TcbRejection("collateral QE identity is not TD_QE");

  const tee = Array.from(input.teeTcbSvn);
  const cpu = Array.from(input.cpuSvn);
  const moduleVersion = tee[1]!;
  const skip = moduleVersion > 0 ? 2 : 0; // a non-zero module version leaves components 0 and 1 to the module identity

  const levels = [...tcbInfo.tcbLevels].sort(
    (a, b) =>
      lexDesc(svns(a.tcb.sgxtcbcomponents), svns(b.tcb.sgxtcbcomponents)) ||
      b.tcb.pcesvn - a.tcb.pcesvn ||
      lexDesc(svns(a.tcb.tdxtcbcomponents), svns(b.tcb.tdxtcbcomponents)),
  );
  const level = levels.find((l) => {
    const sgx = svns(l.tcb.sgxtcbcomponents);
    const tdx = svns(l.tcb.tdxtcbcomponents);
    if (sgx.length !== 16 || tdx.length !== 16) throw new TcbRejection("TCB level component count is not 16");
    return sgx.every((s, i) => cpu[i]! >= s) && input.pceSvn >= l.tcb.pcesvn && tdx.every((s, i) => i < skip || tee[i]! >= s);
  });
  if (!level) throw new TcbRejection("no matching platform TCB level");
  if (!ALL_STATUSES.includes(level.tcbStatus)) throw new TcbRejection(`unknown TCB status ${level.tcbStatus}`);
  let status = level.tcbStatus;
  const advisoryIds = new Set(level.advisoryIDs ?? []);

  let moduleId: { mrsigner: string; attributes: string; attributesMask: string } | undefined = tcbInfo.tdxModule;
  if (moduleVersion > 0) {
    const want = `TDX_${moduleVersion.toString(16).toUpperCase().padStart(2, "0")}`;
    const identity = (tcbInfo.tdxModuleIdentities ?? []).find((i) => i.id.toUpperCase() === want);
    if (!identity) throw new TcbRejection(`no TDX module identity ${want} in TCB info`);
    const ml = identity.tcbLevels.find((l) => tee[0]! >= l.tcb.isvsvn);
    if (!ml) throw new TcbRejection(`TDX module ISVSVN ${tee[0]} is below every module TCB level`);
    if (!["UpToDate", "OutOfDate", "Revoked"].includes(ml.tcbStatus)) throw new TcbRejection(`unknown TDX module status ${ml.tcbStatus}`);
    status = converge(status, ml.tcbStatus);
    for (const a of ml.advisoryIDs ?? []) advisoryIds.add(a);
    moduleId = identity;
  }
  if (!moduleId) throw new TcbRejection("TCB info has no tdxModule");
  if (!hexEq(input.mrSignerSeam, moduleId.mrsigner)) throw new TcbRejection("TDX module MRSIGNER mismatch");
  const attrs = Buffer.from(moduleId.attributes, "hex");
  const mask = Buffer.from(moduleId.attributesMask, "hex");
  for (let i = 0; i < 8; i++) {
    const have = input.seamAttributes[i]!;
    if ((have & mask[i]!) !== (attrs[i]! & mask[i]!) || (have & ~mask[i]! & 0xff) !== 0) {
      throw new TcbRejection("TDX module SEAMATTRIBUTES mismatch");
    }
  }

  const qe = qeIdentity.tcbLevels.find((l) => input.qeIsvSvn >= l.tcb.isvsvn);
  if (!qe) throw new TcbRejection(`QE ISVSVN ${input.qeIsvSvn} is below every QE TCB level`);
  if (!ALL_STATUSES.includes(qe.tcbStatus)) throw new TcbRejection(`unknown QE TCB status ${qe.tcbStatus}`);
  status = converge(status, qe.tcbStatus);
  for (const a of qe.advisoryIDs ?? []) advisoryIds.add(a);

  return { status, advisoryIds: [...advisoryIds] };
}

/* ------------------------------------------------------------------------------------------------------ */

/**
 * Phala Cloud's verifier. Passes only when the response says quote.verified === true AND the TCB status
 * computed from the response's Intel collateral is accepted (DEFAULT_ACCEPTED_TCB, or PHALA_TCB_ACCEPT).
 *   unavailable (DcapUnavailableError, retried): network error, timeout, 5xx, 429, a body that is not JSON,
 *     a checksum for some other quote, or a verified quote without parseable tcb_info / qe_identity
 *   rejection (false): any other non-2xx (Phala answers 400 for an invalid quote), verified !== true, no
 *     matching TCB level, module identity mismatch, or a TCB status outside the accepted set
 * OPEN ITEM: the collateral's Intel signatures and nextUpdate are not checked here; this still trusts Phala
 * for the signature chain, as before, and only stops it from passing an out-of-date platform.
 */
export class PhalaCloudVerifier implements DcapVerifier {
  readonly name = "phala";
  constructor(
    private readonly url = process.env.PHALA_VERIFY_URL ?? PHALA_VERIFY_URL,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly acceptedTcb: ReadonlySet<TcbStatus> = acceptedTcbFrom(process.env.PHALA_TCB_ACCEPT),
  ) {}

  async verify(quote: Uint8Array): Promise<boolean> {
    return (await this.check(quote)).ok;
  }

  async check(quote: Uint8Array): Promise<DcapResult> {
    let r: Response;
    try {
      r = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hex: bytesToHex(quote).slice(2) }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      throw new DcapUnavailableError(`Phala verifier unreachable: ${(e as Error).message}`);
    }
    if (r.status >= 500 || r.status === 429) throw new DcapUnavailableError(`Phala verifier returned ${r.status}`);
    if (!r.ok) return { ok: false, detail: `Phala verifier returned ${r.status}` };
    const j = (await r.json().catch(() => null)) as {
      quote?: { verified?: boolean } | null;
      checksum?: string | null;
      quote_collateral?: { tcb_info?: unknown; qe_identity?: unknown } | null;
    } | null;
    if (!j || typeof j !== "object") throw new DcapUnavailableError("Phala verifier returned a malformed body");
    if (j.quote?.verified !== true) return { ok: false, detail: "quote.verified is not true" };
    if (typeof j.checksum === "string" && j.checksum.toLowerCase() !== createHash("sha256").update(quote).digest("hex")) {
      throw new DcapUnavailableError("Phala verifier answered for a different quote (checksum mismatch)");
    }

    let tcbInfo: TdxTcbInfo;
    let qeIdentity: QeIdentity;
    try {
      const c = j.quote_collateral;
      if (!c || typeof c.tcb_info !== "string" || typeof c.qe_identity !== "string") throw new Error("no collateral");
      const t = JSON.parse(c.tcb_info) as TdxTcbInfo & { tcbInfo?: TdxTcbInfo };
      const qi = JSON.parse(c.qe_identity) as QeIdentity & { enclaveIdentity?: QeIdentity };
      tcbInfo = t.tcbInfo ?? t;
      qeIdentity = qi.enclaveIdentity ?? qi;
      if (!Array.isArray(tcbInfo.tcbLevels) || !Array.isArray(qeIdentity.tcbLevels)) throw new Error("no TCB levels");
    } catch (e) {
      throw new DcapUnavailableError(`Phala verifier returned no usable TCB collateral (${(e as Error).message})`);
    }

    let tcb;
    try {
      tcb = evaluateTdxTcb(quoteTcbInputs(quote), tcbInfo, qeIdentity);
    } catch (e) {
      if (e instanceof TcbRejection) return { ok: false, detail: `TCB evaluation failed: ${e.message}` };
      throw new DcapUnavailableError(`Phala TCB collateral is malformed: ${(e as Error).message}`);
    }
    if (!this.acceptedTcb.has(tcb.status)) {
      const adv = tcb.advisoryIds.length ? ` (${tcb.advisoryIds.join(", ")})` : "";
      return { ok: false, detail: `TCB status ${tcb.status}${adv} is not accepted`, tcbStatus: tcb.status };
    }
    return { ok: true, tcbStatus: tcb.status };
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
