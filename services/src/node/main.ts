import { readFileSync } from "node:fs";
import { createPublicClient, getAddress, http, keccak256, parseAbi, type Address, type Hex } from "viem";
import { cosign, leadRun, type HoldoutSet } from "../attest/cosign.ts";
import { devQuote } from "../attest/devAttestor.ts";
import { Enclave } from "../attest/enclave.ts";
import { composeHashOf } from "../attest/rtmr.ts";
import { loadCorpus } from "../corpus/loader.ts";
import { decryptHoldout } from "../corpus/holdout.ts";
import { NodeClient } from "./client.ts";

/**
 * Harness node (ROLE=harness), runs inside an Intel TDX CVM on dstack (doc §4.2, §5.7).
 *
 *   1. generate the enclave key in memory and get a TDX quote binding it (dev attestor on testnet if
 *      DEV_ATTESTOR=1)
 *   2. announce {key, quote, event log, app-compose} to the coordinator and print what the attester EOA
 *      must submit to AttesterRegistry.registerEnclaveKey (the EOA lives outside the CVM, holding the bond)
 *   3. poll for jobs: lead runs and seals, co-sign verifies and signs, never re-querying the agent
 *
 * Env: COORDINATOR_URL, CHAIN_ID, RHC_RPC_URL, ATTESTERS_RHC, ATTESTER_ADDRESS, APP_COMPOSE_PATH,
 *      HOLDOUT_PATH + HOLDOUT_KEY (sealed secret), DEV_ATTESTOR, POLL_MS.
 */

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`${k} is not set`);
  return v;
};

async function main() {
  const chainId = Number(env("CHAIN_ID", "46630"));
  const registry = getAddress(env("ATTESTERS_RHC")) as Address;
  const appCompose = readFileSync(env("APP_COMPOSE_PATH", "/app/app-compose.json"), "utf8");
  const composeHash = composeHashOf(appCompose);
  const enclave = Enclave.generate();

  const { quote, eventLog } =
    process.env.DEV_ATTESTOR === "1"
      ? devQuote({ chainId, registry, key: enclave.address, composeHash })
      : await enclave.quote(chainId, registry, composeHash);
  const quoteHash = keccak256(quote);

  const corpus = loadCorpus();
  const publicCases = corpus.cases.map((c) => c.case);
  let holdout: HoldoutSet | undefined;
  let commit: Hex;
  if (process.env.HOLDOUT_PATH) {
    const h = decryptHoldout(readFileSync(process.env.HOLDOUT_PATH), Buffer.from(env("HOLDOUT_KEY").replace(/^0x/, ""), "hex"));
    holdout = { cases: h.cases, salt: h.salt };
    commit = h.commit;
  } else {
    commit = env("HOLDOUT_COMMIT") as Hex; // the commitment published with the corpus, when no holdout is configured
  }

  const client = new NodeClient(env("COORDINATOR_URL"), enclave);
  await client.hello({ attester: getAddress(env("ATTESTER_ADDRESS")), publicKey: enclave.publicKey, quote, eventLog, composeHash, appCompose });
  console.log(JSON.stringify({ registerEnclaveKey: { key: enclave.address, rawQuote: quote, composeHash }, corpusRoot: corpus.root, holdoutCommit: commit }));

  const chain = createPublicClient({ transport: http(env("RHC_RPC_URL", "https://rpc.testnet.chain.robinhood.com")) });
  const abi = parseAbi(["function isActiveKey(address) view returns (bool)"]);
  const isActiveKey = (key: Address) => chain.readContract({ address: registry, abi, functionName: "isActiveKey", args: [key] });

  const pollMs = Number(env("POLL_MS", "5000"));
  for (;;) {
    try {
      const { job } = await client.claim();
      if (job?.role === "lead") {
        const out = await leadRun({ job: job.job, publicCases, holdout, corpusRoot: corpus.root, holdoutCommit: commit, enclave, quoteHash, cosigners: job.cosigners });
        await client.submitBundle(out.signed, out.report);
      } else if (job?.role === "cosign") {
        const res = await cosign({ signed: job.signed, publicCases, holdout, me: enclave, isActiveKey });
        await client.submitCosign(job.signed.bundleHash, res);
      } else {
        await Bun.sleep(pollMs);
      }
    } catch (e) {
      console.error("node loop:", (e as Error).message);
      await Bun.sleep(pollMs);
    }
  }
}

if (import.meta.main) await main();
