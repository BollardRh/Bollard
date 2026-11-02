/**
 * Builds the private holdout set: validates the cases, computes holdoutRoot and holdoutCommit, and writes
 * an encrypted bundle. Only holdoutCommit is ever published (doc §6.3).
 *
 *   HOLDOUT_KEY=<32-byte hex> bun scripts/holdout.ts <holdout-dir-outside-repo> --out <file.enc>
 *
 * The holdout directory must live outside this repository. Harness nodes receive HOLDOUT_KEY as a dstack
 * sealed secret bound to the harness compose hash, so only an attested harness enclave can decrypt it.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadCorpus } from "../src/corpus/loader.ts";
import { encryptHoldout } from "../src/corpus/holdout.ts";

const REPO_ROOT = resolve(new URL("../..", import.meta.url).pathname);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const dir = process.argv[2];
const outIdx = process.argv.indexOf("--out");
const out = outIdx > 0 ? process.argv[outIdx + 1] : undefined;
if (!dir || !out) fail("usage: HOLDOUT_KEY=<hex32> bun scripts/holdout.ts <holdout-dir> --out <file.enc>");

const absDir = resolve(dir);
const absOut = resolve(out);
if (absDir.startsWith(REPO_ROOT + "/") || absOut.startsWith(REPO_ROOT + "/")) {
  fail("refusing: the holdout set and its bundle must live outside the repository");
}

const keyHex = process.env.HOLDOUT_KEY ?? "";
if (!/^(0x)?[0-9a-fA-F]{64}$/.test(keyHex)) fail("HOLDOUT_KEY must be 32 bytes of hex");
const key = Buffer.from(keyHex.replace(/^0x/, ""), "hex");

const corpus = loadCorpus(absDir);
const { blob, commit } = encryptHoldout(corpus.cases.map((c) => c.case), key);

writeFileSync(absOut, blob);
writeFileSync(
  `${absOut}.commit.json`,
  JSON.stringify({ holdoutCommit: commit, caseCount: corpus.cases.length, createdAt: new Date().toISOString() }, null, 2),
);
console.log(`holdout cases: ${corpus.cases.length}`);
console.log(`holdoutCommit: ${commit}`);
console.log(`wrote ${absOut} (+ .commit.json). Keep the root and salt private; publish only holdoutCommit.`);
