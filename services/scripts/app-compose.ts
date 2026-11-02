/**
 * Builds harness-node/app-compose.json from harness-node/docker-compose.yml and prints its compose hash
 * (SHA-256 of the exact JSON bytes). Governance allowlists that hash with AttesterRegistry.setAllowedCompose.
 *
 *   bun scripts/app-compose.ts            # release: refuses an image that is not pinned by digest
 *   bun scripts/app-compose.ts --dev      # testnet dev attestor: allows the placeholder digest
 *
 * OPEN ITEM: check the field set against the dstack / Phala Cloud version the nodes run before mainnet.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { composeHashOf } from "../src/attest/rtmr.ts";

const dir = new URL("../../harness-node/", import.meta.url).pathname;
const compose = readFileSync(`${dir}docker-compose.yml`, "utf8");
const dev = process.argv.includes("--dev");

const image = /image:\s*(\S+)/.exec(compose)?.[1] ?? "";
if (!/@sha256:[0-9a-f]{64}$/.test(image) && !dev) {
  console.error(`refusing: image "${image}" is not pinned by a sha256 digest (use --dev for the testnet dev attestor)`);
  process.exit(1);
}

const appCompose = {
  manifest_version: 2,
  name: "bollard-harness",
  runner: "docker-compose",
  docker_compose_file: compose,
  kms_enabled: true,
  gateway_enabled: false,
  local_key_provider_enabled: false,
  public_logs: true,
  public_sysinfo: true,
  public_tcbinfo: true,
  no_instance_id: false,
  allowed_envs: ["COORDINATOR_URL", "ATTESTERS_RHC", "ATTESTER_ADDRESS", "HOLDOUT_KEY"],
};

const json = JSON.stringify(appCompose, null, 2) + "\n";
writeFileSync(`${dir}app-compose.json`, json);
console.log(`wrote harness-node/app-compose.json${dev ? " (DEV: placeholder image digest)" : ""}`);
console.log(`composeHash: ${composeHashOf(json)}`);
