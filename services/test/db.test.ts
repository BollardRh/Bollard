import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "../src/db/schema.ts";

/**
 * Applies supabase/migrations to a fresh database on a real Postgres and checks the result.
 * Needs TEST_DATABASE_URL (a superuser URL, e.g. postgres://postgres@127.0.0.1:54329/postgres).
 * Migrations that need Supabase-only extensions (pgmq, storage, pg_cron, pg_net, vault) are checked
 * statically; the hosted project applies them for real.
 */

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const MIGRATIONS = new URL("../../supabase/migrations/", import.meta.url).pathname;
const SEED = new URL("../../supabase/seed.sql", import.meta.url).pathname;
const SUPABASE_ONLY = /_(queues_storage|cron|advisor_fixes)\.sql$/;

const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
const read = (f: string) => readFileSync(join(MIGRATIONS, f), "utf8");

describe("migration files", () => {
  test("are timestamp-ordered and named for the Supabase CLI", () => {
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z_]+\.sql$/);
    expect(files.length).toBe(10);
  });

  test("queues and storage match the services' expectations", () => {
    const q = read(files.find((f) => f.endsWith("_queues_storage.sql"))!);
    for (const name of ["runs", "cosign", "post", "alerts"]) expect(q).toContain(`pgmq.create('${name}')`);
    for (const b of ["'bundles', 'bundles', true", "'holdout', 'holdout', false", "'quotes', 'quotes', false"]) expect(q).toContain(b);
  });

  test("cron calls every worker endpoint and reads its secrets from Vault", () => {
    const c = read(files.find((f) => f.endsWith("_cron.sql"))!);
    for (const job of ["indexer", "coordinator", "watch-keys", "keeper-fees", "keeper-disputes", "keeper-refunds", "keeper-revokes", "alerts"]) {
      expect(c).toContain(`private.call_api('${job}')`);
    }
    expect(c).toContain("vault.decrypted_secrets where name = 'api_base_url'");
    expect(c).toContain("vault.decrypted_secrets where name = 'cron_secret'");
    expect(c).not.toMatch(/https?:\/\/[a-z0-9.-]+\.(app|com|xyz)/); // no hard-coded URLs
  });
});

const live = ADMIN_URL ? describe : describe.skip;

/** postgres.js queries are lazy thenables, so await them here instead of using expect().rejects. */
async function failsWith(q: PromiseLike<unknown>, pattern: RegExp) {
  let err: unknown;
  try {
    await q;
  } catch (e) {
    err = e;
  }
  expect(String(err)).toMatch(pattern);
}

live("migrated database (real Postgres)", () => {
  const dbName = `bollard_test_${Date.now()}`;
  let admin: postgres.Sql;
  let sql: postgres.Sql;
  let testUrl: string;

  beforeAll(async () => {
    admin = postgres(ADMIN_URL!, { max: 1, onnotice: () => {} });
    await admin.unsafe(`create database ${dbName}`);
    for (const role of ["anon", "authenticated"]) {
      await admin.unsafe(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${role}') then create role ${role} nologin; end if; end $$`);
    }
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${dbName}`;
    testUrl = url.toString();
    // hosted Supabase puts `extensions` on the search path (pg_trgm lives there)
    sql = postgres(testUrl, { max: 1, onnotice: () => {}, connection: { search_path: "public, extensions" } });
    for (const f of files) if (!SUPABASE_ONLY.test(f)) await sql.unsafe(read(f));
    await sql.unsafe(readFileSync(SEED, "utf8"));
  });

  afterAll(async () => {
    await sql?.end();
    await admin?.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin?.end();
  });

  test("Drizzle schema matches the migrated tables column for column", async () => {
    const tables = (Object.values(schema) as unknown[]).filter(
      (t): t is PgTable => typeof t === "object" && t !== null && Symbol.for("drizzle:IsDrizzleTable") in t,
    );
    const dbTables = await sql<{ table_name: string }[]>`select table_name from information_schema.tables where table_schema = 'public'`;
    expect(new Set(tables.map((t) => getTableConfig(t).name))).toEqual(new Set(dbTables.map((r) => r.table_name)));

    for (const t of tables) {
      const cfg = getTableConfig(t);
      const cols = await sql<{ column_name: string; is_nullable: string; udt_name: string }[]>`
        select column_name, is_nullable, udt_name from information_schema.columns
        where table_schema = 'public' and table_name = ${cfg.name}`;
      const dbCols = new Map(cols.map((c) => [c.column_name, c]));
      expect(new Set(cfg.columns.map((c) => c.name))).toEqual(new Set(dbCols.keys()));
      for (const c of cfg.columns) {
        const d = dbCols.get(c.name)!;
        expect(`${cfg.name}.${c.name} nullable=${d.is_nullable === "YES"}`).toBe(`${cfg.name}.${c.name} nullable=${!c.notNull}`);
        const want = c.getSQLType().replace(/\(.*\)/, "").replace("[]", "");
        const got = d.udt_name.replace(/^_/, "");
        const same: Record<string, string> = { integer: "int4", bigint: "int8", bigserial: "int8", boolean: "bool", "timestamp with time zone": "timestamptz" };
        expect(`${cfg.name}.${c.name}:${same[want] ?? want}`).toBe(`${cfg.name}.${c.name}:${got}`);
      }
    }
  });

  test("uint256 values round-trip exactly", async () => {
    const max = (2n ** 256n - 1n).toString();
    await sql`insert into attesters (chain_id, address, bond, unbonding) values (46630, '0xabc', ${max}, 0)`;
    const [row] = await sql`select bond::text from attesters where address = '0xabc'`;
    expect(row!.bond).toBe(max);
  });

  test("status and grade checks reject bad values", async () => {
    const insert = (status: string, grade: number) => sql`
      insert into ratings (chain_id, rating_id, request_id, agent_registry, agent_id, version_hash, score, grade,
        tested_mask, failed_mask, expires_at, digest, attesters, status, tx_hash, block_number)
      values (46630, ${Math.floor(Math.random() * 1e9)}, 1, '0xreg', 1, '0xv', 90, ${grade}, 255, 0, now(), '0xd', '{}', ${status}, '0xt', 1)`;
    await insert("active", 4);
    await failsWith(insert("approved", 4), /ratings_status_chk/);
    await failsWith(insert("active", 6), /ratings_grade_chk/);
  });

  test("trigram search index is used for agent names", async () => {
    const [idx] = await sql`select indexdef from pg_indexes where indexname = 'agents_name_trgm'`;
    expect(idx!.indexdef).toContain("gin_trgm_ops");
    await sql`insert into agents (chain_id, agent_registry, agent_id, name) values (46630, '0xreg', 7, 'Lobster Treasury Bot')`;
    const rows = await sql`select agent_id from agents where name % 'lobster tresury'`;
    expect(rows.length).toBe(1);
  });

  test("take_token spends a bucket and refuses when empty", async () => {
    const take = async () => (await sql`select take_token('ip:1.2.3.4', 1, 3, 0) as ok`)[0]!.ok;
    expect([await take(), await take(), await take(), await take()]).toEqual([true, true, true, false]);
  });

  test("take_token refills over time", async () => {
    expect((await sql`select take_token('ip:refill', 1, 1, 1000) as ok`)[0]!.ok).toBe(true);
    await Bun.sleep(20);
    expect((await sql`select take_token('ip:refill', 1, 1, 1000) as ok`)[0]!.ok).toBe(true);
  });

  test("concurrent spenders cannot overspend", async () => {
    const pool = postgres(testUrl, { max: 10, onnotice: () => {} });
    try {
      const results = await Promise.all(Array.from({ length: 25 }, () => pool`select take_token('ip:race', 1, 10, 0) as ok`));
      expect(results.filter((r) => r[0]!.ok).length).toBe(10);
    } finally {
      await pool.end();
    }
  });

  test("node nonces are single-use", async () => {
    const use = async (n: string) => (await sql`select use_node_nonce('0xKEY', ${n}) as ok`)[0]!.ok;
    expect(await use("n-1")).toBe(true);
    expect(await use("n-1")).toBe(false);
    expect(await use("n-2")).toBe(true);
  });

  test("seed creates the testnet indexer cursors", async () => {
    const rows = await sql`select stream from cursors where chain_id = 46630 order by stream`;
    expect(rows.map((r) => r.stream)).toEqual(["arena_bounty", "attester_registry", "fee_router", "rating_registry", "safe_rating_guard"]);
  });

  describe("public Data API roles are locked out", () => {
    const asRole = async <T>(role: string, q: (tx: postgres.TransactionSql) => Promise<T>) =>
      sql.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        return q(tx);
      });

    test("every public table has row level security on", async () => {
      const off = await sql`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`;
      expect(off.map((r) => r.tablename)).toEqual([]);
    });

    for (const role of ["anon", "authenticated"]) {
      test(`${role} cannot read ratings`, async () => {
        await failsWith(asRole(role, (tx) => tx`select * from ratings`), /permission denied/);
      });

      test(`${role} cannot write agents`, async () => {
        await failsWith(asRole(role, (tx) => tx`insert into agents (chain_id, agent_registry, agent_id) values (1, 'x', 1)`), /permission denied/);
      });

      test(`${role} cannot call take_token or use_node_nonce`, async () => {
        await failsWith(asRole(role, (tx) => tx`select take_token('x', 1, 1, 1)`), /permission denied/);
        await failsWith(asRole(role, (tx) => tx`select use_node_nonce('x', 'y')`), /permission denied/);
      });
    }
  });
});
