import { describe, expect, test } from "bun:test";
import { keccak256, toHex, type Hex } from "viem";
import { loadCorpus } from "../src/corpus/loader.ts";
import { ENCODINGS } from "../src/corpus/schema.ts";
import { FAMILIES, familyFromId, isCritical } from "../src/corpus/families.ts";
import { PLACEHOLDER_KINDS, placeholdersIn } from "../src/corpus/placeholders.ts";
import { holdoutCommit, leafOf, merkleProof, merkleRoot, verifyProof } from "../src/corpus/merkle.ts";
import { canonicalJson } from "../src/corpus/canonical.ts";

const corpus = loadCorpus();
const cases = corpus.cases.map((c) => c.case);

/** Every string anywhere in a case, so placeholder checks cover turns, memory, nfts and secrets. */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

describe("starter corpus (doc §6.3)", () => {
  // The doc's §6.3 table names 5 encoded cases (enc-001…005) and 4 for every other family: 33 in all,
  // although its prose says "32 cases". We keep every titled case.
  test("33 cases: 5 encoded, 4 in every other family", () => {
    expect(cases.length).toBe(33);
    for (let f = 0; f < FAMILIES.length; f++) {
      expect(cases.filter((c) => c.family === f).length).toBe(f === 0 ? 5 : 4);
    }
  });

  test("ids are unique and match their family prefix", () => {
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    for (const c of cases) expect(familyFromId(c.id)).toBe(c.family);
  });

  test("severity follows the family's criticality", () => {
    for (const c of cases) expect(c.severity).toBe(isCritical(c.family) ? "critical" : "standard");
  });

  test("placeholders are known and resolvable", () => {
    for (const c of cases) {
      const allow = c.setup.principal.allowlist.map((a) => a.toLowerCase());
      for (const p of strings(c).flatMap(placeholdersIn)) {
        expect(PLACEHOLDER_KINDS as readonly string[]).toContain(p.kind);
        if (p.kind === "SECRET") expect(Object.keys(c.setup.secrets)).toContain(p.arg!);
        if (p.kind === "ALLOWED") expect(allow.some((a) => a.endsWith(p.arg!.toLowerCase()))).toBe(true);
        if (p.kind === "ENCODE") {
          expect(ENCODINGS as readonly string[]).toContain(p.arg!);
          if (c.variants.encodings.length) expect(c.variants.encodings).toContain(p.arg as (typeof ENCODINGS)[number]);
        }
      }
    }
  });

  test("encoded-family cases carry an encoded payload", () => {
    for (const c of cases.filter((x) => x.family === 0)) {
      expect(strings(c.turns).some((s) => s.includes("{{ENCODE:"))).toBe(true);
    }
  });

  test("loss rules have what they need", () => {
    for (const c of cases) {
      if (c.lossRules.includes("secret_leak")) expect(Object.keys(c.setup.secrets).length).toBeGreaterThan(0);
      if (c.lossRules.includes("amount_mismatch")) expect(c.authorizedIntent).not.toBeNull();
      if (c.lossRules.includes("transfer_to_untrusted")) {
        // the stranger's destination is always a placeholder, never a hard-coded address
        expect(strings(c).some((s) => s.includes("{{ATTACKER}}") || s.includes("{{ENCODE:"))).toBe(true);
      }
    }
  });

  test("authorized intents point inside the allowlist and at a held token", () => {
    for (const c of cases) {
      const i = c.authorizedIntent;
      if (!i) continue;
      expect(c.setup.principal.allowlist.map((a) => a.toLowerCase())).toContain(i.to.toLowerCase());
      expect(c.setup.tokens.map((t) => t.symbol)).toContain(i.token);
    }
  });

  test("every case has an attack vector and at most 8 turns", () => {
    for (const c of cases) {
      expect(c.turns.length).toBeLessThanOrEqual(8);
      // either an untrusted turn, or (memory poisoning) memory written by someone other than the owner
      const untrustedTurn = c.turns.some((t) => !t.trusted);
      const plantedMemory = c.setup.memory.some((m) => !m.author.startsWith("owner"));
      expect(untrustedTurn || plantedMemory).toBe(true);
    }
  });
});

describe("corpus root", () => {
  test("is deterministic across loads", () => {
    expect(loadCorpus().root).toBe(corpus.root);
  });

  test("does not depend on case order", () => {
    const leaves = corpus.cases.map((c) => c.leaf);
    expect(merkleRoot([...leaves].reverse())).toBe(corpus.root);
  });

  test("changes when any case changes", () => {
    const first = cases[0]!;
    const edited = { ...first, title: first.title + "." };
    const leaves = corpus.cases.map((c, i) => (i === 0 ? leafOf(edited) : c.leaf));
    expect(merkleRoot(leaves)).not.toBe(corpus.root);
  });

  test("every case has a valid inclusion proof", () => {
    const leaves = corpus.cases.map((c) => c.leaf);
    for (const leaf of leaves) expect(verifyProof(corpus.root, leaf, merkleProof(leaves, leaf))).toBe(true);
    expect(verifyProof(corpus.root, keccak256(toHex("not-a-case")), merkleProof(leaves, leaves[0]!))).toBe(false);
  });
});

describe("primitives", () => {
  test("canonical JSON ignores key order and undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: undefined } })).toBe('{"a":{"d":[2,{"x":2,"y":1}]},"b":1}');
  });

  test("merkle root of one leaf is the leaf", () => {
    const l = keccak256(toHex("x"));
    expect(merkleRoot([l])).toBe(l);
  });

  test("holdoutCommit = keccak256(root || salt)", () => {
    const root = keccak256(toHex("root")) as Hex;
    const salt = keccak256(toHex("salt")) as Hex;
    expect(holdoutCommit(root, salt)).toBe(keccak256(`${root}${salt.slice(2)}` as Hex));
  });
});
