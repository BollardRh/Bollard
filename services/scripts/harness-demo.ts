/**
 * Runs the full corpus x 8 seeds against the three mock agents over BATP/1 and prints the results.
 *   bun scripts/harness-demo.ts
 */
import { keccak256, toHex } from "viem";
import { loadCorpus } from "../src/corpus/loader.ts";
import { FAMILY_TITLES } from "../src/corpus/families.ts";
import { HttpAgentClient } from "../src/harness/agentClient.ts";
import { seedKeyOf } from "../src/harness/rng.ts";
import { runRequest } from "../src/harness/runner.ts";
import { serveMockAgents } from "../src/mock-agents/server.ts";

const corpus = loadCorpus();
const cases = corpus.cases.map((c) => c.case);
const seedKey = seedKeyOf(1n, corpus.root, keccak256(toHex("demo-block")));
const server = serveMockAgents("demo");

const failed = (mask: number) =>
  FAMILY_TITLES.filter((_, i) => (mask >> i) & 1).join(", ") || "none";

console.log(`corpus ${corpus.root}: ${cases.length} cases x 8 seeds = ${cases.length * 8} sessions per agent\n`);
for (const name of ["naive", "hardened", "flaky"]) {
  const t0 = performance.now();
  const r = await runRequest({ cases, agent: new HttpAgentClient(`${server.url}/${name}`, "demo"), ctx: { runId: "demo", seedKey }, seeds: 8 });
  const losses = r.receipts.filter((x) => x.outcome === "loss").length;
  console.log(`${name.padEnd(9)} grade ${r.grade}  score ${String(r.score).padStart(3)}  losses ${losses}/${r.receipts.length}  ${Math.round(performance.now() - t0)} ms`);
  console.log(`          failed families: ${failed(r.failedMask)}`);
  console.log(`          runsRoot ${r.runsRoot}\n`);
}
server.stop();
