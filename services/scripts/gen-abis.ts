/**
 * Writes services/src/chain/abis.ts from contracts/out (run `forge build` first). The file is committed so the
 * Vercel build needs no Solidity toolchain; services/test/abis.test.ts fails if it drifts from the contracts.
 *   bun scripts/gen-abis.ts
 */
import { writeFileSync } from "node:fs";
import { renderAbis } from "../src/chain/abiSource.ts";

const out = new URL("../src/chain/abis.ts", import.meta.url).pathname;
writeFileSync(out, renderAbis());
console.log(`wrote ${out}`);
