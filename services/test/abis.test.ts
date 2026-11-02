import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { CONTRACTS_OUT, renderAbis } from "../src/chain/abiSource.ts";

/** src/chain/abis.ts is generated from contracts/out; fail if the contracts changed without regenerating. */
const ready = existsSync(`${CONTRACTS_OUT}RatingRegistry.sol/RatingRegistry.json`);

(ready ? describe : describe.skip)("generated ABIs", () => {
  test("match the compiled contracts (run: bun scripts/gen-abis.ts)", () => {
    const committed = readFileSync(new URL("../src/chain/abis.ts", import.meta.url), "utf8");
    expect(committed).toBe(renderAbis());
  });
});
