/**
 * Curate corpus candidates (arena wins) through the API's ops-only endpoints.
 *
 *   set -a; source .env.testnet.local; set +a
 *   BOLLARD_API_URL=https://usebollard.tech bun services/scripts/corpus-candidates.ts list [pending|public|holdout|rejected]
 *   BOLLARD_API_URL=https://usebollard.tech bun services/scripts/corpus-candidates.ts show <id>
 *   BOLLARD_API_URL=https://usebollard.tech bun services/scripts/corpus-candidates.ts mark <id> <public|holdout|rejected|pending> [family 0-7]
 *
 * Marking only records the decision. To add the case: write it in the corpus format (public cases in
 * services/corpus/public/, holdout cases in ~/bollard-private/holdout/ then services/scripts/holdout.ts), then
 * publish the new root / holdout commitment with publishCorpus through the timelock and redeploy.
 */
const API = (process.env.BOLLARD_API_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CRON_SECRET ?? "";
if (!API || !SECRET) throw new Error("set BOLLARD_API_URL and source .env.testnet.local (CRON_SECRET)");

const call = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(`${API}/api/admin${path}`, { ...init, headers: { "x-cron-secret": SECRET, "content-type": "application/json", ...(init.headers ?? {}) } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(j)}`);
  return j as any;
};

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "list") {
  const rows = await call(`/candidates${a ? `?status=${encodeURIComponent(a)}` : ""}`);
  if (!rows.length) console.log("no candidates");
  for (const r of rows) console.log(`#${r.id}  ${r.status.padEnd(8)}  ${r.source}  arena ${r.arenaId ?? "-"}  attacker ${r.attacker ?? "-"}  ${r.messages} messages  family ${r.familyGuess ?? "?"}  ${r.createdAt}`);
} else if (cmd === "show" && a) {
  const r = await call(`/candidates/${a}`);
  console.log(`#${r.id} ${r.status} from ${r.source}, arena ${r.arenaId}, attacker ${r.attacker}`);
  console.log(`win tx ${r.transcript.winTx}  transcript hash ${r.transcript.transcriptHash}`);
  for (const m of r.transcript.messages ?? []) {
    console.log(`\n[${m.role}] ${m.content}`);
    for (const x of m.actions ?? []) console.log(`   -> ${x.tool} ${JSON.stringify(x.args)} executed=${x.executed}${x.won ? " WON" : ""}${x.error ? ` (${x.error})` : ""}`);
  }
} else if (cmd === "mark" && a && b) {
  console.log(await call(`/candidates/${a}`, { method: "POST", body: JSON.stringify({ status: b, ...(c !== undefined ? { family: Number(c) } : {}) }) }));
} else {
  throw new Error("usage: corpus-candidates.ts list [status] | show <id> | mark <id> <status> [family]");
}

export {};
