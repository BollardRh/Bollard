import { sql } from "drizzle-orm";
import { alertLog } from "../db/schema.ts";
import type { AppDeps } from "../api/context.ts";

/**
 * Alerts (doc §8 notifier): tells Telegram watchers when a watched agent's rating is disputed, about to
 * expire (72h), or stale because the owner declared a newer version. alert_log makes each one fire once.
 */
export async function runAlerts(deps: AppDeps) {
  const rows = await deps.db.execute<{ kind: string; rating_id: string; agent_id: string; grade: number; expires_at: string; chat: string; current_version: string | null }>(sql`
    with latest as (
      select distinct on (r.chain_id, r.agent_registry, r.agent_id) r.*
      from ratings r where r.chain_id = ${deps.chain.chainId}
      order by r.chain_id, r.agent_registry, r.agent_id, r.rating_id desc
    ), flagged as (
      select 'disputed' as kind, l.* from latest l where l.status = 'disputed'
      union all
      select 'expiring', l.* from latest l where l.status = 'active' and l.expires_at between now() and now() + interval '72 hours'
      union all
      select 'stale', l.* from latest l join agents a on a.chain_id = l.chain_id and a.agent_registry = l.agent_registry and a.agent_id = l.agent_id
        where l.status = 'active' and a.current_version is not null and a.current_version <> l.version_hash
    )
    select f.kind, f.rating_id::text, f.agent_id::text, f.grade, f.expires_at, w.telegram_chat_id::text as chat,
           (select current_version from agents a where a.chain_id = f.chain_id and a.agent_registry = f.agent_registry and a.agent_id = f.agent_id) as current_version
    from flagged f join watches w on w.chain_id = f.chain_id and w.agent_registry = f.agent_registry and w.agent_id = f.agent_id
    limit 500`);

  let sent = 0;
  for (const r of rows) {
    const key = `${r.kind}:${deps.chain.chainId}:${r.rating_id}:${r.chat}${r.kind === "stale" ? `:${r.current_version}` : ""}`;
    const inserted = await deps.db.insert(alertLog).values({ key }).onConflictDoNothing().returning();
    if (!inserted.length) continue;
    const text =
      r.kind === "disputed"
        ? `Agent ${r.agent_id}: rating #${r.rating_id} (grade ${r.grade}) is disputed. Gates fail closed until it is resolved.`
        : r.kind === "expiring"
          ? `Agent ${r.agent_id}: rating #${r.rating_id} (grade ${r.grade}) expires ${new Date(r.expires_at).toISOString()}. A new run is needed to keep it.`
          : `Agent ${r.agent_id}: a newer version was declared, so rating #${r.rating_id} is stale. A new run is needed.`;
    await deps.notify(r.chat, text);
    sent++;
  }
  return { flagged: rows.length, sent };
}
