import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/** Fresh database with the plain-Postgres migrations applied (Supabase-only ones are skipped). */
const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url).pathname;
const SUPABASE_ONLY = /_(queues_storage|cron|advisor_fixes)\.sql$/;

export async function createTestDb(adminUrl: string) {
  const name = `bollard_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database ${name}`);
  for (const role of ["anon", "authenticated"]) {
    await admin.unsafe(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${role}') then create role ${role} nologin; end if; end $$`);
  }
  const u = new URL(adminUrl);
  u.pathname = `/${name}`;
  const url = u.toString();
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) {
    if (!SUPABASE_ONLY.test(f)) await sql.unsafe(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  await sql.end();
  return {
    url,
    drop: async () => {
      await admin.unsafe(`drop database if exists ${name} with (force)`);
      await admin.end();
    },
  };
}
