import { readFileSync } from "node:fs";
import { getAddress, keccak256, type Address, type Hex } from "viem";
import { cosign, leadRun, type HoldoutSet } from "../attest/cosign.ts";
import { devQuote } from "../attest/devAttestor.ts";
import { Enclave } from "../attest/enclave.ts";
import { composeHashOf } from "../attest/rtmr.ts";
import { loadCorpus } from "../corpus/loader.ts";
import { decryptHoldout } from "../corpus/holdout.ts";
import { NodeClient } from "./client.ts";
import { devEnclave, devSelfRegister } from "./devRegister.ts";
import { JobRefused, openNodeChain } from "./jobCheck.ts";

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
 *      HOLDOUT_PATH or HOLDOUT_B64, + HOLDOUT_KEY (sealed secrets), DEV_ATTESTOR, POLL_MS.
 */

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`${k} is not set`);
  return v;
};

async function main() {
  const chainId = Number(env("CHAIN_ID", "4663"));
  const registry = getAddress(env("ATTESTERS_RHC")) as Address;
  const ratingRegistry = getAddress(env("REGISTRY_RHC")) as Address;
  const rpcUrl = env("RHC_RPC_URL", "https://rpc.mainnet.chain.robinhood.com");
  const appCompose = readFileSync(env("APP_COMPOSE_PATH", "/app/app-compose.json"), "utf8");
  const composeHash = composeHashOf(appCompose);
  const dev = process.env.DEV_ATTESTOR === "1";
  const enclave = dev ? devEnclave(chainId, process.env.DEV_ENCLAVE_KEY_FILE) : Enclave.generate();

  const { quote, eventLog } =
    dev
      ? devQuote({ chainId, registry, key: enclave.address, composeHash })
      : await enclave.quote(chainId, registry, composeHash);
  const quoteHash = keccak256(quote);

  const corpus = loadCorpus();
  // pinned chain view; throws (the node does not start) if the RPC or the registries are not the configured ones
  const chain = await openNodeChain({ rpcUrl, chainId, ratingRegistry, attesterRegistry: registry, corpusRoot: corpus.root });
  const publicCases = corpus.cases.map((c) => c.case);
  let holdout: HoldoutSet | undefined;
  let commit: Hex;
  // HOLDOUT_B64: the encrypted bundle as a Phala encrypted env (it is ~22 KB), so no volume has to be filled
  const sealed = process.env.HOLDOUT_PATH
    ? readFileSync(process.env.HOLDOUT_PATH)
    : process.env.HOLDOUT_B64
      ? Buffer.from(process.env.HOLDOUT_B64, "base64")
      : undefined;
  if (sealed) {
    const h = decryptHoldout(sealed, Buffer.from(env("HOLDOUT_KEY").replace(/^0x/, ""), "hex"));
    holdout = { cases: h.cases, salt: h.salt };
    commit = h.commit;
  } else {
    commit = env("HOLDOUT_COMMIT") as Hex; // the commitment published with the corpus, when no holdout is configured
  }

  const client = new NodeClient(env("COORDINATOR_URL"), enclave);
  console.log(JSON.stringify({ registerEnclaveKey: { key: enclave.address, rawQuote: quote, composeHash }, corpusRoot: corpus.root, holdoutCommit: commit }));
  if (dev && process.env.ATTESTER_PRIVATE_KEY && process.env.STAKE_TOKEN_RHC) {
    const r = await devSelfRegister({
      chainId,
      rpcUrl,
      attesters: registry,
      stakeToken: getAddress(process.env.STAKE_TOKEN_RHC),
      attesterKey: process.env.ATTESTER_PRIVATE_KEY as Hex,
      enclave,
      quote,
      composeHash,
    });
    console.log(`dev self-registration: ${r} (key ${enclave.address})`);
  }

  // The API accepts hello only once the key is registered on-chain (self-registered above on testnet, or by
  // the attester's EOA from the printed registerEnclaveKey call), so keep trying until it is.
  const helloBody = { attester: getAddress(env("ATTESTER_ADDRESS")), publicKey: enclave.publicKey, quote, eventLog, composeHash, appCompose };
  let said = false;
  const pollMs = Number(env("POLL_MS", "30000"));
  for (;;) {
    try {
      if (!said) {
        await client.hello(helloBody);
        said = true;
        console.log("hello accepted");
      }
      const { job } = await client.claim();
      if (job?.role === "lead") {
        let out;
        try {
          out = await leadRun({ job: job.job, chain, publicCases, holdout, corpusRoot: corpus.root, holdoutCommit: commit, enclave, quoteHash, cosigners: job.cosigners });
        } catch (e) {
          if (!(e instanceof JobRefused)) throw e;
          // nothing was run, sealed or signed; skip the job (the coordinator may offer it again, it is re-checked)
          console.error(`refused lead job for request ${job.job.requestId}: ${e.problems.join("; ")}`);
          await Bun.sleep(pollMs);
          continue;
        }
        await client.submitBundle(out.signed, out.report);
      } else if (job?.role === "cosign") {
        const res = await cosign({ job: job.job, signed: job.signed, publicCases, holdout, me: enclave, chain });
        if (!res.ok) console.error(`refused to co-sign ${job.signed.bundleHash}: ${res.problems.join("; ")}`);
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
