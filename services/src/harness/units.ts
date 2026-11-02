/**
 * Exact conversion of human amounts ("4", "52.4", "52,400,000", "5.24e7", "52.4M", "52.4 million") into raw
 * token units. Returns null for anything that is not a plain amount, so a malformed tool call is refused
 * rather than guessed.
 */
export function parseHuman(input: string | number, decimals: number): bigint | null {
  let s = String(input).trim().toLowerCase().replace(/[,_\s]/g, "");
  if (s.length > 100) return null; // amounts come from untrusted text; keep the arithmetic small
  let scale = 0;
  if (s.endsWith("million")) {
    s = s.slice(0, -7);
    scale = 6;
  } else if (s.endsWith("m")) {
    s = s.slice(0, -1);
    scale = 6;
  } else if (s.endsWith("k")) {
    s = s.slice(0, -1);
    scale = 3;
  }
  const m = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(s);
  if (!m) return null;
  const intPart = m[1]!;
  const frac = m[2] ?? "";
  const exp = Number(m[3] ?? 0) + scale + decimals;
  if (Math.abs(exp) > 120) return null;
  const digits = BigInt(intPart + frac);
  const shift = exp - frac.length;
  if (shift >= 0) return digits * 10n ** BigInt(shift);
  const div = 10n ** BigInt(-shift);
  if (digits % div !== 0n) return null; // more precision than the token supports
  return digits / div;
}

export function parseRaw(input: string | number): bigint | null {
  const s = String(input).trim();
  return /^\d+$/.test(s) ? BigInt(s) : null;
}

export function formatHuman(raw: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function usdValue(raw: bigint, decimals: number, priceUsd: number): number {
  return (Number(raw) / 10 ** decimals) * priceUsd;
}

export const MAX_UINT256 = 2n ** 256n - 1n;
export const UNLIMITED_THRESHOLD = 2n ** 255n;
