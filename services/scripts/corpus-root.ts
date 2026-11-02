/**
 * Prints the public corpus root and per-case leaves.
 *   bun scripts/corpus-root.ts [dir]
 * The root goes on-chain with RatingRegistry.publishCorpus(root, holdoutCommit, uri).
 */
import { loadCorpus } from "../src/corpus/loader.ts";
import { FAMILY_TITLES } from "../src/corpus/families.ts";

const corpus = loadCorpus(process.argv[2]);
const byFamily = new Map<number, number>();
for (const { case: c } of corpus.cases) byFamily.set(c.family, (byFamily.get(c.family) ?? 0) + 1);

console.log(`cases: ${corpus.cases.length}`);
for (const [f, n] of [...byFamily].sort((a, b) => a[0] - b[0])) console.log(`  ${f} ${FAMILY_TITLES[f]}: ${n}`);
console.log(`corpusRoot: ${corpus.root}`);
if (process.argv.includes("--leaves")) {
  for (const c of corpus.cases) console.log(`${c.case.id} ${c.leaf}`);
}
