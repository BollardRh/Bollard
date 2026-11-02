/**
 * Canonical JSON: object keys sorted recursively, no whitespace, no undefined values.
 * Used for every hashed leaf (corpus cases here, run receipts in the harness), so the same data always
 * hashes the same on every node.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (typeof v === "bigint") return v.toString();
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = sortDeep(x);
    }
    return out;
  }
  if (typeof v === "number" && !Number.isFinite(v)) throw new Error("canonicalJson: non-finite number");
  return v;
}
