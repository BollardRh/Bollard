import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { getAddress, keccak256, parseEther, toHex, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import * as schema from "../src/db/schema.ts";
import { createApp } from "../src/api/app.ts";
import { createBot } from "../src/api/bot.ts";
import type { AppDeps } from "../src/api/context.ts";
import { MemoryStorage } from "../src/api/storage.ts";
import { fixListTypedData, setEndpointTypedData } from "../src/api/builder.ts";
import { cosign, leadRun } from "../src/attest/cosign.ts";
import { DevDcapVerifier } from "../src/attest/dcap.ts";
import { DEV_OS_MEASUREMENT, devQuote } from "../src/attest/devAttestor.ts";
import { Enclave } from "../src/attest/enclave.ts";
import { composeHashOf } from "../src/attest/rtmr.ts";
import { loadCorpus } from "../src/corpus/loader.ts";
import { holdoutCommit } from "../src/corpus/merkle.ts";
import { NodeClient } from "../src/node/client.ts";
import { openNodeChain } from "../src/node/jobCheck.ts";
import { serveMockAgents } from "../src/mock-agents/server.ts";
import { artifact, localChainReady, startAnvil, type LocalChain } from "./helpers/localchain.ts";
import { createTestDb } from "./helpers/testdb.ts";

/**
 * Phase 6 done-when (plan): anvil + Postgres + the API + 3 dev-attestor nodes + a mock agent, going
 * request -> index -> assign -> lead run -> co-sign -> post -> index -> check() OK, all over HTTP.
 * Needs anvil, forge build output and TEST_DATABASE_URL; skipped otherwise.
 */

const ADMIN = process.env.TEST_DATABASE_URL;
const maybe = ADMIN && localChainReady() ? describe : describe.skip;

maybe("API end to end (local chain + Postgres)", () => {
  const A = {
    erc20: artifact("Mocks.sol", "MockERC20"),
    identity: artifact("Mocks.sol", "MockIdentity8004"),
    reputation: artifact("Mocks.sol", "MockReputation8004"),
    attesters: artifact("AttesterRegistry.sol", "AttesterRegistry"),
    feeRouter: artifact("FeeRouter.sol", "FeeRouter"),
    registry: artifact("RatingRegistry.sol", "RatingRegistry"),
  };
  const corpus = loadCorpus();
  const publicCases = corpus.cases.map((c) => c.case);
  const commit = holdoutCommit(keccak256(toHex("empty-holdout")), keccak256(toHex("salt")));
  const appCompose = readFileSync(new URL("../../harness-node/app-compose.json", import.meta.url), "utf8");
  const composeHash = composeHashOf(appCompose);
  const enclaves = [Enclave.generate(), Enclave.generate(), Enclave.generate()];
  const notes: { chat: string; text: string }[] = [];

  let chain: LocalChain;
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let pg: postgres.Sql;
  let deps: AppDeps;
  let api: ReturnType<typeof Bun.serve>;
  let base: string;
  let agents: ReturnType<typeof serveMockAgents>;
  let addr: Record<"usdg" | "blrd" | "identity" | "attesters" | "feeRouter" | "registry", Address>;
  const quotes: Hex[] = [];
  const clients: NodeClient[] = [];

  const cron = async (job: string) => {
    const r = await fetch(`${base}/api/cron/${job}`, { method: "POST", headers: { "x-cron-secret": "cron-test" } });
    const j = (await r.json()) as { ok: boolean; result: unknown };
    if (r.status !== 200) throw new Error(`${job}: ${r.status} ${JSON.stringify(j)}`);
    return j.result as Record<string, unknown>;
  };
  const trpcQuery = async (path: string, input: unknown) => {
    const r = await fetch(`${base}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`);
    return (await r.json()) as { result?: { data: unknown }; error?: unknown };
  };
  const trpcMutation = async (path: string, input: unknown) => {
    const r = await fetch(`${base}/api/trpc/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    return (await r.json()) as { result?: { data: unknown }; error?: unknown };
  };

  beforeAll(async () => {
    chain = await startAnvil();
    db = await createTestDb(ADMIN!);
    const gov = chain.wallet(0);
    const g = gov.account!.address;
    const usdg = await chain.deploy(gov, A.erc20, ["Test USDG", "tUSDG", 6]);
    const blrd = await chain.deploy(gov, A.erc20, ["Test BLRD", "tBLRD", 18]);
    const identity = await chain.deploy(gov, A.identity, []);
    const reputation = await chain.deploy(gov, A.reputation, []);
    // 1-second key challenge window so keys go active without warping chain time away from the DB clock
    const attesters = await chain.deploy(gov, A.attesters, [blrd, g, g, parseEther("1000"), 10n * 86_400n, 1n, parseEther("100")]);
    const feeRouter = await chain.deploy(gov, A.feeRouter, [g, g, g, g, g, usdg, 99_000_000n]);
    const params = {
      quorum: 2, minSeeds: 8, scoreTolerance: 10, criticalMask: 0xb7, requiredTestedMask: 0xff,
      maxTtl: 30n * 86_400n, maxReportAge: 86_400n, disputeWindow: 72n * 3600n, tiebreakWindow: 72n * 3600n,
      requestTtl: 14n * 86_400n, runFee: 300_000_000n, disputeSlashAmount: parseEther("1000"),
    };
    const registry = await chain.deploy(gov, A.registry, [attesters, feeRouter, usdg, g, g, identity, reputation, params]);
    addr = { usdg, blrd, identity, attesters, feeRouter, registry };
    await chain.send(gov, attesters, A.attesters.abi, "setSlasher", [registry]);
    await chain.send(gov, attesters, A.attesters.abi, "setAllowedOs", [DEV_OS_MEASUREMENT, true]);
    await chain.send(gov, attesters, A.attesters.abi, "setAllowedCompose", [composeHash, true]);
    await chain.send(gov, registry, A.registry.abi, "publishCorpus", [corpus.root, commit, "ipfs://bollard-corpus"]);

    pg = postgres(db.url, { prepare: false, max: 10, onnotice: () => {} });
    deps = {
      db: drizzle(pg, { schema }),
      chain: {
        chainId: 31337,
        name: "Local",
        rpcUrl: chain.rpc,
        explorer: "",
        confirmations: 0,
        startBlock: 0n,
        contracts: { ratingRegistry: registry, attesterRegistry: attesters, feeRouter, feeToken: usdg, identity8004: identity },
      },
      viemChain: foundry,
      publicClient: chain.pub as unknown as AppDeps["publicClient"],
      poster: gov as unknown as AppDeps["poster"],
      storage: new MemoryStorage(),
      corpus: { root: corpus.root, cases: publicCases },
      dcap: new DevDcapVerifier(31337),
      cronSecret: "cron-test",
      notify: async (chat, text) => {
        notes.push({ chat: String(chat), text });
      },
      allowHttpEndpoints: true,
      now: () => Date.now(),
    };
    api = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: createApp(deps).fetch });
    base = `http://127.0.0.1:${api.port}`;
    agents = serveMockAgents(); // the hardened agent does not check the run token
  }, 120_000);

  afterAll(async () => {
    agents?.stop();
    api?.stop(true);
    await pg?.end();
    await db?.drop();
    chain?.stop();
  });

  test("nodes say hello, attesters bond and register dev-attested keys", async () => {
    for (let i = 0; i < 3; i++) {
      const w = chain.wallet(i + 1);
      const q = devQuote({ chainId: 31337, registry: addr.attesters, key: enclaves[i]!.address, composeHash });
      quotes.push(q.quote);
      clients.push(new NodeClient(base, enclaves[i]!));
      const hello = () =>
        clients[i]!.hello({ attester: w.account!.address, publicKey: enclaves[i]!.publicKey, quote: q.quote, eventLog: q.eventLog, composeHash, appCompose });
      // hello is refused until the key is registered on-chain
      expect(String(await hello().catch((e) => e))).toContain("register the enclave key on-chain first");
      await chain.send(chain.wallet(0), addr.blrd, A.erc20.abi, "mint", [w.account!.address, parseEther("1000")]);
      await chain.send(w, addr.blrd, A.erc20.abi, "approve", [addr.attesters, parseEther("1000")]);
      await chain.send(w, addr.attesters, A.attesters.abi, "bond", [parseEther("1000")]);
      await chain.send(w, addr.attesters, A.attesters.abi, "registerEnclaveKey", [enclaves[i]!.address, q.quote, composeHash]);
      expect(await hello()).toEqual({ ok: true });
    }
  }, 60_000);

  test("builder requests a run and the indexer picks everything up", async () => {
    const owner = chain.wallet(4);
    await chain.send(chain.wallet(0), addr.identity, A.identity.abi, "register", [owner.account!.address, owner.account!.address]);
    await chain.send(chain.wallet(0), addr.usdg, A.erc20.abi, "mint", [owner.account!.address, 1_000_000_000n]);
    await chain.send(owner, addr.usdg, A.erc20.abi, "approve", [addr.registry, 1_000_000_000n]);
    await chain.send(owner, addr.registry, A.registry.abi, "requestRun", [addr.identity, 1n, keccak256(toHex("hardened-v1")), `0x${"00".repeat(32)}`]);
    await Bun.sleep(1200); // past the 1 s key window
    await chain.mine(2);

    const idx = await cron("indexer");
    expect((idx.streams as { logs: number }[]).reduce((n, s) => n + s.logs, 0)).toBeGreaterThan(5);
    const [req] = await deps.db.select().from(schema.runRequests).where(eq(schema.runRequests.requestId, "1"));
    expect(req).toMatchObject({ status: "open", payer: owner.account!.address.toLowerCase() });
    const keys = await deps.db.select().from(schema.enclaveKeys);
    expect(keys.length).toBe(3);

    const w = (await cron("watch-keys")) as { checked: { ok: boolean }[] };
    expect(w.checked.map((x) => x.ok)).toEqual([true, true, true]);
  }, 60_000);

  const nowS = () => Math.floor(Date.now() / 1000);
  const errOf = (r: { error?: unknown }) => JSON.stringify(r.error ?? null);

  test("the payer names the endpoint with EIP-712 and gets a run token; stale and replayed signatures are refused", async () => {
    const owner = chain.wallet(4);
    const endpoint = `${agents.url}/hardened`;
    const sign = (w: ReturnType<LocalChain["wallet"]>, m: { endpoint: string; issuedAt: number; deadline: number }) =>
      w.signTypedData({ account: w.account!, ...setEndpointTypedData(deps, { requestId: "1", ...m }) });
    const submit = async (w: ReturnType<LocalChain["wallet"]>, m: { endpoint: string; issuedAt: number; deadline: number }, signature?: Hex) =>
      trpcMutation("builder.setEndpoint", { chainId: 31337, requestId: "1", ...m, signature: signature ?? (await sign(w, m)) });

    // the config endpoint publishes the domain the dashboard signs against
    const cfg = (await (await fetch(`${base}/api/v1/config`)).json()) as { typedData: { domain: Record<string, unknown>; types: Record<string, unknown> } };
    expect(cfg.typedData.domain).toEqual({ name: "Bollard", version: "1", chainId: 31337, verifyingContract: getAddress(addr.registry) });
    expect(Object.keys(cfg.typedData.types).sort()).toEqual(["ReadFixList", "SetEndpoint"]);

    const t0 = nowS() - 30;
    expect(errOf(await submit(chain.wallet(3), { endpoint, issuedAt: t0, deadline: t0 + 600 }))).toContain("not from the payer");
    expect(errOf(await submit(owner, { endpoint, issuedAt: t0 - 700, deadline: t0 - 100 }))).toContain("signature expired");
    expect(errOf(await submit(owner, { endpoint, issuedAt: t0, deadline: nowS() + 7200 }))).toContain("deadline must be within");
    expect(errOf(await submit(owner, { endpoint, issuedAt: nowS() + 3600, deadline: nowS() + 3600 }))).toContain("issuedAt is in the future");
    // a signature for another field value (here: deadline) does not verify as the payer
    const forged = await sign(owner, { endpoint, issuedAt: t0, deadline: t0 + 600 });
    expect(errOf(await submit(owner, { endpoint, issuedAt: t0, deadline: t0 + 500 }, forged))).toContain("not from the payer");

    // an earlier signature for another endpoint, held back by someone
    const oldM = { endpoint: `${agents.url}/naive`, issuedAt: t0 - 10, deadline: t0 + 600 };
    const oldSig = await sign(owner, oldM);

    const m1 = { endpoint, issuedAt: t0, deadline: t0 + 600 };
    const sig1 = await sign(owner, m1);
    const ok = await submit(owner, m1, sig1);
    const token = (ok.result?.data as { runToken: string }).runToken;
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // the same signature again, and the older one, are both refused and leave the endpoint alone
    expect(errOf(await submit(owner, m1, sig1))).toContain("newer endpoint signature was already accepted");
    expect(errOf(await submit(owner, oldM, oldSig))).toContain("newer endpoint signature was already accepted");
    const [req] = await deps.db.select().from(schema.runRequests).where(eq(schema.runRequests.requestId, "1"));
    expect(req).toMatchObject({ endpoint, endpointSignedAt: t0 });

    // a fresh signature works and keeps the same run token
    const again = await submit(owner, { endpoint, issuedAt: t0 + 1, deadline: t0 + 600 });
    expect((again.result?.data as { runToken: string }).runToken).toBe(token);
  });

  test("assign -> lead run -> co-sign -> post -> index -> check() OK", async () => {
    const co = await cron("coordinator");
    expect(co.assigned).toEqual(["1"]);

    // each node's own pinned view of the chain (the same one main.ts opens)
    const nodeChain = await openNodeChain({
      rpcUrl: chain.rpc, chainId: 31337, ratingRegistry: addr.registry, attesterRegistry: addr.attesters, corpusRoot: corpus.root,
    });
    const roles: string[] = [];
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 3; i++) {
        const { job } = await clients[i]!.claim();
        if (job?.role === "lead") {
          const out = await leadRun({
            job: job.job,
            chain: nodeChain,
            publicCases,
            corpusRoot: corpus.root,
            holdoutCommit: commit,
            enclave: enclaves[i]!,
            quoteHash: keccak256(quotes[i]!),
            cosigners: job.cosigners,
          });
          await clients[i]!.submitBundle(out.signed, out.report);
          roles.push("lead");
        } else if (job?.role === "cosign") {
          const res = await cosign({ job: job.job, signed: job.signed, publicCases, me: enclaves[i]!, chain: nodeChain });
          await clients[i]!.submitCosign(job.signed.bundleHash, res);
          roles.push(res.ok ? "cosign" : `refuse:${res.problems.join(";")}`);
        }
      }
    }
    expect(roles.sort()).toEqual(["cosign", "cosign", "lead"]);

    const post = await cron("coordinator");
    const posted = (post.posted as { requestId: string; tx?: string }[])[0];
    expect(posted?.requestId).toBe("1");
    expect(posted?.tx ?? "").toMatch(/^0x[0-9a-f]{64}$/);
    await cron("indexer");
    expect((await deps.db.select().from(schema.ratings)).length).toBe(1);

    const check = await (await fetch(`${base}/v1/check/31337/1?min=5&mask=255`)).json();
    expect(check).toMatchObject({ ok: true, code: 0, codeName: "OK" });

    const rating = (await (await fetch(`${base}/v1/rating/31337/1`)).json()) as { grade: number; usable: boolean; bundle: { hash: string } | null };
    expect(rating).toMatchObject({ grade: 5, usable: true });
    expect(rating.bundle?.hash).toMatch(/^0x/);

    const status = await trpcQuery("builder.runStatus", { chainId: 31337, requestId: "1" });
    expect(status.result?.data).toMatchObject({ status: "rated", cosigners: 2 });

    const stats = (await (await fetch(`${base}/api/v1/stats`)).json()) as { activeRatings: number; activeKeys: number };
    expect(stats).toMatchObject({ activeRatings: 1, activeKeys: 3 });
  }, 120_000);

  test("the owner reads the fix list with an EIP-712 signature; others and expired signatures cannot", async () => {
    const owner = chain.wallet(4);
    const sig = (w: ReturnType<LocalChain["wallet"]>, deadline: number) =>
      w.signTypedData({ account: w.account!, ...fixListTypedData(deps, { ratingId: "1", deadline }) });
    const read = async (w: ReturnType<LocalChain["wallet"]>, deadline: number) =>
      trpcMutation("builder.fixList", { chainId: 31337, ratingId: "1", deadline, signature: await sig(w, deadline) });
    const deadline = nowS() + 600;
    expect((await read(owner, deadline)).result?.data).toMatchObject({ failedCases: [], holdout: [] });
    expect(errOf(await read(chain.wallet(3), deadline))).toContain("only the agent owner");
    expect(errOf(await read(owner, nowS() - 1))).toContain("signature expired");
    expect(errOf(await read(owner, nowS() + 7200))).toContain("deadline must be within");
    // a signature over another rating id does not authorise this one
    const other = await owner.signTypedData({ account: owner.account!, ...fixListTypedData(deps, { ratingId: "2", deadline }) });
    const r = await trpcMutation("builder.fixList", { chainId: 31337, ratingId: "1", deadline, signature: other });
    expect(errOf(r)).toContain("only the agent owner");
  });

  test("Telegram: /rating and /watch, then a stale-version alert", async () => {
    const sent: { method: string; payload: Record<string, unknown> }[] = [];
    const bot = createBot(deps, "123:test");
    bot.api.config.use(async (_prev, method, payload) => {
      sent.push({ method, payload: payload as Record<string, unknown> });
      return { ok: true, result: { message_id: 1, date: 0, chat: { id: 42, type: "private" } } } as never;
    });
    const msg = (text: string, id: number) => ({
      update_id: id,
      message: { message_id: id, date: 0, chat: { id: 42, type: "private" as const, first_name: "t" }, from: { id: 42, is_bot: false, first_name: "t" }, text, entities: [{ type: "bot_command" as const, offset: 0, length: text.indexOf(" ") }] },
    });
    await bot.handleUpdate(msg("/rating 1", 1));
    expect(String(sent[0]?.payload.text)).toContain("grade 5/5");
    await bot.handleUpdate(msg("/watch 1", 2));
    expect(String(sent[1]?.payload.text)).toContain("Watching agent 1");

    const owner = chain.wallet(4);
    await chain.send(owner, addr.registry, A.registry.abi, "declareVersion", [addr.identity, 1n, keccak256(toHex("hardened-v2"))]);
    await cron("indexer");
    const alerts = (await cron("alerts")) as { sent: number };
    expect(alerts.sent).toBe(1);
    expect(notes.at(-1)).toMatchObject({ chat: "42" });
    expect(notes.at(-1)!.text).toContain("stale");
    expect(((await cron("alerts")) as { sent: number }).sent).toBe(0); // fires once

    const check = await (await fetch(`${base}/v1/check/31337/1?min=1&mask=0`)).json();
    expect(check).toMatchObject({ ok: false, codeName: "STALE_VERSION" });
  }, 60_000);

  test("a paid API plan (FeeRouter.payPlan) is indexed and lifts the key's rate limit", async () => {
    const key = "plan-test-key";
    const keyHash = `0x${createHash("sha256").update(key).digest("hex")}` as Hex;
    const payer = chain.wallet(0);
    const limitFor = async () => (await fetch(`${base}/v1/search?q=1`, { headers: { "x-api-key": key } })).headers.get("x-ratelimit-limit");
    await chain.send(payer, addr.usdg, A.erc20.abi, "mint", [payer.account!.address, 198_000_000n]);
    await chain.send(payer, addr.usdg, A.erc20.abi, "approve", [addr.feeRouter, 198_000_000n]);
    await chain.send(payer, addr.feeRouter, A.feeRouter.abi, "payPlan", [keyHash, 1]);
    await chain.send(payer, addr.feeRouter, A.feeRouter.abi, "payPlan", [keyHash, 1]); // renewal takes the update path
    await cron("indexer");
    const [row] = await deps.db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyHash, keyHash.slice(2)));
    expect(row?.plan).toBe("paid");
    expect(row!.paidUntil!.getTime()).toBeGreaterThan(Date.now() + 55 * 86_400_000); // two months
    expect(await limitFor()).toBe("100000");
  }, 60_000);

  test("guards: cron secret, unsigned node calls, keeper no-ops", async () => {
    expect((await fetch(`${base}/api/cron/indexer`, { method: "POST" })).status).toBe(403);
    expect((await fetch(`${base}/api/node/claim`, { method: "POST", body: "{}" })).status).toBe(401);
    const fees = (await cron("keeper-fees")) as { released: unknown[] };
    expect(fees.released).toEqual([]); // dispute window (72h) still open
  });
});
