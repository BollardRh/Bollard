import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hex } from "viem";
import { AttackCase } from "./schema.ts";
import { leafOf, merkleRoot } from "./merkle.ts";

/** Bundled deployments set BOLLARD_CORPUS_DIR; source checkouts use services/corpus/public. */
export const PUBLIC_CORPUS_DIR = fileURLToPath(new URL("../../corpus/public/", import.meta.url)); // works on Windows too

const defaultDir = () => process.env.BOLLARD_CORPUS_DIR ?? PUBLIC_CORPUS_DIR;

export interface LoadedCase {
  case: AttackCase;
  leaf: Hex;
  file: string;
}

export interface Corpus {
  cases: LoadedCase[];
  root: Hex;
}

/** Parses every *.json file in `dir` (each holds an array of cases), validates, and computes the root. */
export function loadCorpus(dir: string = defaultDir()): Corpus {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const cases: LoadedCase[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown;
    if (!Array.isArray(raw)) throw new Error(`${file}: expected an array of cases`);
    for (const item of raw) {
      const parsed = AttackCase.safeParse(item);
      if (!parsed.success) {
        const id = (item as { id?: string })?.id ?? "?";
        throw new Error(`${file} ${id}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      }
      cases.push({ case: parsed.data, leaf: leafOf(parsed.data), file });
    }
  }
  if (cases.length === 0) throw new Error(`no cases in ${dir}`);
  return { cases, root: merkleRoot(cases.map((c) => c.leaf)) };
}
