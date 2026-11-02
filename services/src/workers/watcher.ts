import { and, asc, eq, gt, or, isNull, sql } from "drizzle-orm";
import { getAddress, type Hex } from "viem";
import { enclaveKeys, nodeRegistrations } from "../db/schema.ts";
import { verifyRegistration } from "../attest/verify.ts";
import { DcapUnavailableError } from "../attest/dcap.ts";
import type { DstackEvent } from "../attest/rtmr.ts";
import type { AppDeps } from "../api/context.ts";

/**
 * Attestation watcher (doc §4.2 step 5): checks every enclave key still inside its challenge window. The
 * node publishes its event log and app-compose through /api/node/hello; a key registered without them, or
 * that fails any check, is marked "fail" (the coordinator never assigns it) and reported for challengeKey.
 */
export async function runWatcher(deps: AppDeps) {
  const keys = await deps.db
    .select()
    .from(enclaveKeys)
    .where(
      and(
        eq(enclaveKeys.chainId, deps.chain.chainId),
        eq(enclaveKeys.revoked, false),
        or(isNull(enclaveKeys.watcherVerdict), eq(enclaveKeys.watcherVerdict, "pending")),
        gt(enclaveKeys.activeAt, new Date(deps.now() - 86_400_000)),
      ),
    )
    .orderBy(asc(enclaveKeys.activeAt))
    .limit(100);

  const results: { key: string; ok: boolean; reasons: string[] }[] = [];
  const retry: string[] = [];
  let checked = 0;
  for (const k of keys) {
    const [reg] = await deps.db.select().from(nodeRegistrations).where(eq(nodeRegistrations.key, k.key));
    let ok = false;
    let reasons: string[];
    if (!reg) {
      reasons = ["no event log or app-compose published for this key"];
      // give the node until the window closes to say hello
      if (k.activeAt.getTime() - deps.now() > 3600_000) continue;
    } else {
      if (checked >= 25) break; // bounded work per tick; keys without a hello above cost nothing
      checked++;
      let v;
      try {
        v = await verifyRegistration(
        {
          quote: `0x${Buffer.from(k.rawQuote).toString("hex")}` as Hex,
          eventLog: reg.eventLog as DstackEvent[],
          appCompose: reg.appCompose,
          composeHash: k.composeHash as Hex,
          key: getAddress(k.key),
          chainId: deps.chain.chainId,
          registry: deps.chain.contracts.attesterRegistry,
        },
        deps.dcap,
        );
      } catch (e) {
        if (!(e instanceof DcapUnavailableError)) throw e;
        retry.push(k.key); // verifier outage: stay pending and check again next tick, never "fail"
        continue;
      }
      ok = v.ok && reg.composeHash === k.composeHash;
      reasons = v.reasons.concat(reg.composeHash === k.composeHash ? [] : ["hello compose hash differs from the registered one"]);
    }
    await deps.db
      .update(enclaveKeys)
      .set({ watcherVerdict: ok ? "pass" : "fail", eventLog: reg?.eventLog ?? sql`${enclaveKeys.eventLog}` })
      .where(and(eq(enclaveKeys.chainId, k.chainId), eq(enclaveKeys.key, k.key)));
    if (!ok && deps.telegram?.opsChatId) {
      await deps.notify(
        deps.telegram.opsChatId,
        `Watcher: enclave key ${k.key} (attester ${k.attester}) failed: ${reasons.join("; ")}. Call challengeKey before ${k.activeAt.toISOString()}.`,
      );
    }
    results.push({ key: k.key, ok, reasons });
  }
  return { checked: results, retry };
}
