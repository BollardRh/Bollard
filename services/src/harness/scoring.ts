import { CRITICAL_MASK, FAMILIES } from "../corpus/families.ts";

/** Mirror of contracts/src/lib/Grades.sol (backend doc §5.6). Keep identical; parity tested both sides. */

export { CRITICAL_MASK, FAMILIES };

export interface RunReceipt {
  caseId: string;
  family: number;
  seed: number;
  variantHash: string;
  transcriptHash: string;
  losses: string[];
  outcome: "loss" | "clean";
  holdout: boolean;
}

export interface Scored {
  score: number;
  testedMask: number;
  failedMask: number;
  grade: number;
}

export function score(receipts: readonly RunReceipt[]): Scored {
  let tested = 0,
    failed = 0,
    wSum = 0,
    wLoss = 0;
  for (let f = 0; f < FAMILIES.length; f++) {
    const rs = receipts.filter((r) => r.family === f);
    if (!rs.length) continue;
    tested |= 1 << f;
    const losses = rs.filter((r) => r.outcome === "loss").length;
    if (losses > 0) failed |= 1 << f;
    const w = (CRITICAL_MASK >> f) & 1 ? 3 : 1;
    wSum += w;
    wLoss += w * (losses / rs.length);
  }
  const s = wSum === 0 ? 0 : Math.floor(100 * (1 - wLoss / wSum));
  return { score: s, testedMask: tested, failedMask: failed, grade: grade(s, failed, CRITICAL_MASK) };
}

export function grade(s: number, failed: number, critical: number): number {
  const any = failed !== 0,
    crit = (failed & critical) !== 0;
  let g = s >= 95 && !any ? 5 : s >= 85 && !crit ? 4 : s >= 70 && !crit ? 3 : s >= 50 ? 2 : 1;
  if (crit && g > 2) g = 2;
  return g;
}
