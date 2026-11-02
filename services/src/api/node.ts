import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { Hono, type Context } from "hono";
import {
  getAddress,
  recoverAddress,
  recoverMessageAddress,
  type Address,
  type Hex,
} from "viem";
import { publicKeyToAddress } from "viem/accounts";
import { attesterRegistryAbi } from "../chain/abis.ts";
import { cosignatures, cosignRefusals, corpusVersions, nodeRegistrations, runBundles, runReceipts, runRequests } from "../db/schema.ts";
import { useNodeNonce } from "../db/client.ts";
import { reportDigest } from "../chain/report.ts";
import { bundleHash, reportOf } from "../harness/bundle.ts";
import { seedKeyOf } from "../harness/rng.ts";
import { composeHashOf, type DstackEvent } from "../attest/rtmr.ts";
import type { RunJob, SignedBundle } from "../attest/cosign.ts";
import { verifyRequest } from "../node/auth.ts";
import type { AppDeps } from "./context.ts";
import { lc } from "./ratings.ts";

/**
 * Harness node API (doc §5.7, adapted: nodes hold no database credentials). Every request is signed by the
 * node's enclave key; all but /hello also require that key to be active on-chain.
 */

export const jsonBig = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));

export function createNodeHelpers(deps: AppDeps) {
  const cache = new Map<string, { v: boolean; until: number }>();
  const isActiveKey = async (key: Address) => {
    const k = lc(key);
    const hit = cache.get(k);
    if (hit && hit.until > deps.now()) return hit.v;
    const v = (await deps.publicClient.readContract({
      address: deps.chain.contracts.attesterRegistry,
      abi: attesterRegistryAbi,
      functionName: "isActiveKey",
      args: [getAddress(key)],
    })) as boolean;
    if (cache.size > 5_000) cache.clear();
    cache.set(k, { v, until: deps.now() + 15_000 });
    return v;
  };
  const attesterOf = async (key: Address) =>
    lc(
      (await deps.publicClient.readContract({
        address: deps.chain.contracts.attesterRegistry,
        abi: attesterRegistryAbi,
        functionName: "attesterOf",
        args: [getAddress(key)],
      })) as string,
    );
  return { isActiveKey, attesterOf };
}

const HexStr = z.string().regex(/^0x[0-9a-fA-F]*$/);
/** What a node publishes about itself. Sizes are capped: a dstack quote is ~5 KB and an event log a few dozen entries. */
const Hello = z.object({
  publicKey: HexStr.max(140),
  quote: HexStr.max(16_384),
  eventLog: z.array(z.record(z.unknown())).max(128),
  composeHash: HexStr.length(66),
  appCompose: z.string().max(65_536),
});

async function runJobOf(deps: AppDeps, req: typeof runRequests.$inferSelect): Promise<RunJob> {
  const next = await deps.publicClient.getBlock({ blockNumber: req.requestBlock + 1n });
  return {
    chainId: req.chainId,
    registry: deps.chain.contracts.ratingRegistry,
    agentRegistry: getAddress(req.agentRegistry),
    agentId: BigInt(req.agentId),
    versionHash: req.versionHash as Hex,
    requestId: BigInt(req.requestId),
    requestNextBlockHash: next.hash!,
    endpoint: req.endpoint ?? "",
    runToken: req.runToken ?? "",
  };
}

export function nodeRoutes(deps: AppDeps) {
  const app = new Hono();
  const { isActiveKey, attesterOf } = createNodeHelpers(deps);

  async function auth(c: Context, requireActive: boolean) {
    const body = await c.req.text();
    const headers = Object.fromEntries(c.req.raw.headers.entries());
    const res = await verifyRequest(headers, c.req.method, new URL(c.req.url).pathname, body, {
      isActiveKey: requireActive ? isActiveKey : async () => true,
      useNonce: (k, n) => useNodeNonce(deps.db, k, n),
      now: deps.now(),
    });
    return { res, body };
  }
  const reply = (c: Context, v: unknown, status = 200) =>
    c.body(jsonBig(v), status as 200, { "content-type": "application/json" });

  // -------------------------------------------------------------- hello
  app.post("/api/node/hello", async (c) => {
    const { res, body } = await auth(c, false);
    if (!res.ok) return reply(c, { error: res.reason }, res.status);
    const parsed = Hello.safeParse(JSON.parse(body));
    if (!parsed.success) return reply(c, { error: "malformed hello" }, 400);
    const b = parsed.data as unknown as { publicKey: Hex; quote: Hex; eventLog: DstackEvent[]; composeHash: Hex; appCompose: string };
    if (JSON.stringify(b.eventLog).length > 131_072) return reply(c, { error: "event log too large" }, 400);
    // only keys already registered on-chain may publish; the attester is whoever registered the key
    const attester = await attesterOf(res.key);
    if (/^0x0{40}$/.test(attester)) return reply(c, { error: "register the enclave key on-chain first" }, 403);
    if (lc(publicKeyToAddress(b.publicKey)) !== lc(res.key)) return reply(c, { error: "public key does not match the signing key" }, 400);
    if (composeHashOf(b.appCompose) !== lc(b.composeHash)) return reply(c, { error: "composeHash != SHA-256(appCompose)" }, 400);
    const row = {
      key: lc(res.key),
      attester,
      publicKey: b.publicKey,
      composeHash: lc(b.composeHash),
      quote: b.quote,
      eventLog: b.eventLog,
      appCompose: b.appCompose,
      lastSeen: new Date(deps.now()),
    };
    await deps.db.insert(nodeRegistrations).values(row).onConflictDoUpdate({ target: nodeRegistrations.key, set: row });
    return reply(c, { ok: true });
  });

  // -------------------------------------------------------------- claim
  app.post("/api/node/claim", async (c) => {
    const { res } = await auth(c, true);
    if (!res.ok) return reply(c, { error: res.reason }, res.status);
    const key = lc(res.key);
    await deps.db.update(nodeRegistrations).set({ lastSeen: new Date(deps.now()) }).where(eq(nodeRegistrations.key, key));

    // co-sign work first: it unblocks ratings that are already run
    const [cos] = await deps.db.execute<{ bundle_hash: string; chain_id: number; request_id: string }>(sql`
      select b.bundle_hash, b.chain_id, b.request_id::text from run_bundles b
      join run_requests r on r.chain_id = b.chain_id and r.request_id = b.request_id
      where b.posted_tx is null and ${key} = any(r.assigned_cosigners) and b.lead_key = r.assigned_lead
        and not exists (select 1 from cosignatures s where s.bundle_hash = b.bundle_hash and s.enclave_key = ${key})
        and not exists (select 1 from cosign_refusals f where f.bundle_hash = b.bundle_hash and f.enclave_key = ${key})
      order by b.created_at limit 1`);
    if (cos) {
      const raw = await deps.storage.get("bundles", `${cos.bundle_hash}.json`);
      const [req] = await deps.db
        .select()
        .from(runRequests)
        .where(and(eq(runRequests.chainId, cos.chain_id), eq(runRequests.requestId, cos.request_id)));
      // co-signers recompute from the bundle; they never call the endpoint, so they do not get its run token
      if (raw && req) return reply(c, { job: { role: "cosign", job: { ...(await runJobOf(deps, req)), runToken: "" }, signed: JSON.parse(raw) as SignedBundle } });
    }

    const [lead] = await deps.db.execute<{ chain_id: number; request_id: string }>(sql`
      select r.chain_id, r.request_id::text from run_requests r
      where r.status = 'running' and r.assigned_lead = ${key}
        and not exists (select 1 from run_bundles b where b.chain_id = r.chain_id and b.request_id = r.request_id and b.lead_key = r.assigned_lead)
      order by r.created_at limit 1`);
    if (lead) {
      const [req] = await deps.db
        .select()
        .from(runRequests)
        .where(and(eq(runRequests.chainId, lead.chain_id), eq(runRequests.requestId, lead.request_id)));
      const keys = req!.assignedCosigners ?? [];
      const regs = keys.length ? await deps.db.select().from(nodeRegistrations).where(inArray(nodeRegistrations.key, keys)) : [];
      const cosigners = regs.map((r) => ({ address: getAddress(r.key), publicKey: r.publicKey as Hex }));
      return reply(c, { job: { role: "lead", job: await runJobOf(deps, req!), cosigners } });
    }
    return reply(c, { job: null });
  });

  // -------------------------------------------------------------- bundle (lead)
  app.post("/api/node/bundle", async (c) => {
    const { res, body } = await auth(c, true);
    if (!res.ok) return reply(c, { error: res.reason }, res.status);
    const key = lc(res.key);
    const { signed, report } = JSON.parse(body) as { signed: SignedBundle; report: { digest: Hex; signature: Hex } };
    const b = signed.bundle;
    const bad = (m: string) => reply(c, { error: m }, 400);

    if (b.report.chainId !== deps.chain.chainId || lc(b.report.registry) !== lc(deps.chain.contracts.ratingRegistry)) return bad("wrong chain or registry");
    const [req] = await deps.db
      .select()
      .from(runRequests)
      .where(and(eq(runRequests.chainId, b.report.chainId), eq(runRequests.requestId, b.report.requestId)));
    if (!req || req.status !== "running" || req.assignedLead !== key) return reply(c, { error: "not the assigned lead for a running request" }, 403);
    if (lc(b.report.agentRegistry) !== req.agentRegistry || b.report.agentId !== req.agentId || lc(b.report.versionHash) !== lc(req.versionHash)) {
      return bad("subject does not match the request");
    }
    if (lc(b.attestation.leadKey) !== key) return bad("leadKey is not the signer");
    if (bundleHash(b) !== signed.bundleHash) return bad("bundle hash mismatch");
    if (lc(await recoverMessageAddress({ message: { raw: signed.bundleHash }, signature: signed.leadSig })) !== key) return bad("bad lead signature");
    const digest = reportDigest(b.report.chainId, getAddress(b.report.registry), reportOf(b));
    if (digest !== report.digest || lc(await recoverAddress({ hash: digest, signature: report.signature })) !== key) return bad("bad report signature");
    const [corpus] = await deps.db.select().from(corpusVersions).where(eq(corpusVersions.root, lc(b.corpusRoot)));
    if (!corpus || corpus.retired || lc(corpus.holdoutCommit) !== lc(b.holdoutCommit)) return bad("corpus or holdout commitment not published");
    if (lc(b.corpusRoot) !== lc(deps.corpus.root)) return bad("bundle was not run on the current corpus");
    const [existing] = await deps.db
      .select({ h: runBundles.bundleHash })
      .from(runBundles)
      .where(and(eq(runBundles.chainId, req.chainId), eq(runBundles.requestId, req.requestId), eq(runBundles.leadKey, key)));
    if (existing) return reply(c, { error: "this lead already uploaded a bundle for the request" }, 409);
    const next = await deps.publicClient.getBlock({ blockNumber: req.requestBlock + 1n });
    if (seedKeyOf(BigInt(req.requestId), b.corpusRoot, next.hash!) !== b.seedKey) return bad("seed key not derived from the request");

    const attester = await attesterOf(res.key);
    await deps.db.transaction(async (tx) => {
      await tx
        .insert(runBundles)
        .values({
          bundleHash: signed.bundleHash,
          chainId: b.report.chainId,
          requestId: b.report.requestId,
          leadKey: key,
          corpusRoot: lc(b.corpusRoot),
          holdoutCommit: lc(b.holdoutCommit),
          runsRoot: b.runsRoot,
          seeds: b.seeds,
          score: b.score,
          grade: b.grade,
          testedMask: b.testedMask,
          failedMask: b.failedMask,
          publicUri: deps.storage.publicUrl("bundles", `${signed.bundleHash}.json`),
          report: JSON.parse(jsonBig(reportOf(b))),
          reportDigest: digest,
        })
        .onConflictDoNothing();
      const receipts = b.sessions.map((s) => ({
        bundleHash: signed.bundleHash,
        caseId: s.receipt.caseId,
        family: s.receipt.family,
        seed: s.receipt.seed,
        variantHash: s.receipt.variantHash,
        transcriptHash: s.receipt.transcriptHash,
        losses: s.receipt.losses,
        holdout: false,
      }));
      for (let i = 0; i < receipts.length; i += 500) await tx.insert(runReceipts).values(receipts.slice(i, i + 500)).onConflictDoNothing();
      await tx
        .insert(cosignatures)
        .values({ bundleHash: signed.bundleHash, chainId: b.report.chainId, enclaveKey: key, attester, digest, signature: report.signature })
        .onConflictDoNothing();
      await tx.update(runRequests).set({ updatedAt: new Date(deps.now()) }).where(and(eq(runRequests.chainId, req.chainId), eq(runRequests.requestId, req.requestId)));
      // last, inside the transaction: if the upload fails, no row points at a missing bundle
      await deps.storage.put("bundles", `${signed.bundleHash}.json`, jsonBig(signed));
    });
    return reply(c, { ok: true, bundleHash: signed.bundleHash });
  });

  // -------------------------------------------------------------- cosign
  app.post("/api/node/cosign", async (c) => {
    const { res, body } = await auth(c, true);
    if (!res.ok) return reply(c, { error: res.reason }, res.status);
    const key = lc(res.key);
    const { bundleHash: h, result } = JSON.parse(body) as {
      bundleHash: string;
      result: { ok: true; digest: Hex; signature: Hex } | { ok: false; problems: string[] };
    };
    const [b] = await deps.db.select().from(runBundles).where(eq(runBundles.bundleHash, h));
    if (!b) return reply(c, { error: "unknown bundle" }, 404);
    const [req] = await deps.db.select().from(runRequests).where(and(eq(runRequests.chainId, b.chainId), eq(runRequests.requestId, b.requestId)));
    if (!req?.assignedCosigners?.includes(key)) return reply(c, { error: "not an assigned co-signer" }, 403);

    if (!result.ok) {
      const problems = (Array.isArray(result.problems) ? result.problems : []).slice(0, 20).map((p) => String(p).slice(0, 300));
      await deps.db.insert(cosignRefusals).values({ bundleHash: h, enclaveKey: key, problems }).onConflictDoNothing();
      if (deps.telegram?.opsChatId) {
        await deps.notify(deps.telegram.opsChatId, `Co-signer ${key} refused bundle ${h} (request ${b.requestId}): ${problems.slice(0, 5).join("; ")}`);
      }
      return reply(c, { ok: true, recorded: "refusal" });
    }
    if (result.digest !== b.reportDigest) return reply(c, { error: "digest does not match the stored report" }, 400);
    if (lc(await recoverAddress({ hash: result.digest, signature: result.signature })) !== key) return reply(c, { error: "bad signature" }, 400);
    await deps.db
      .insert(cosignatures)
      .values({ bundleHash: h, chainId: b.chainId, enclaveKey: key, attester: await attesterOf(res.key), digest: result.digest, signature: result.signature })
      .onConflictDoNothing();
    return reply(c, { ok: true });
  });

  return app;
}
