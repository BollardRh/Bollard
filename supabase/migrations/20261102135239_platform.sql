-- Platform pieces that replace Redis in a Vercel + Supabase deployment. Plain Postgres: no Supabase-only
-- extensions here, so this file also runs on a stock Postgres for tests.

-- ------------------------------------------------------------------ allowed values
alter table run_requests      add constraint run_requests_status_chk      check (status in ('open', 'running', 'rated', 'refunded'));
alter table ratings           add constraint ratings_status_chk           check (status in ('active', 'disputed', 'void'));
alter table ratings           add constraint ratings_grade_chk            check (grade between 1 and 5 and score between 0 and 100);
alter table enclave_keys      add constraint enclave_keys_verdict_chk     check (watcher_verdict is null or watcher_verdict in ('pass', 'fail', 'pending'));
alter table corpus_candidates add constraint corpus_candidates_status_chk check (status in ('pending', 'public', 'holdout', 'rejected'));
alter table attack_cases      add constraint attack_cases_family_chk      check (family between 0 and 7);
alter table run_receipts      add constraint run_receipts_family_chk      check (family between 0 and 7);

-- ------------------------------------------------------------------ indexes the workers query by
create index run_requests_open   on run_requests (chain_id, status, created_at) where status in ('open', 'running');
create index ratings_pending_fee on ratings (chain_id, dispute_deadline) where status = 'active' and not fees_released;
create index ratings_expiring    on ratings (expires_at) where status = 'active';
create index chain_events_block  on chain_events (chain_id, block_number, log_index);
create index chain_events_name   on chain_events (chain_id, name, block_number);
create index enclave_keys_watch  on enclave_keys (chain_id, active_at) where watcher_verdict is null or watcher_verdict = 'pending';
create index arena_attempts_live on arena_attempts (chain_id, arena_id, attacker, expires_at);
create index arena_messages_sess on arena_messages (session_id, id);
create index corpus_cands_status on corpus_candidates (status, created_at);
create index watches_agent       on watches (chain_id, agent_registry, agent_id);

-- ------------------------------------------------------------------ rate limits (doc §8: 1,000/day per IP or key)
-- Token bucket per key. take_token() refills by elapsed time and spends `p_cost` in one row-locked UPDATE,
-- so concurrent Vercel functions cannot overspend.
create table rate_limits (
  key        text        primary key,
  tokens     numeric     not null,
  updated_at timestamptz not null default now()
);

create or replace function take_token(p_key text, p_cost numeric, p_capacity numeric, p_refill_per_sec numeric)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into rate_limits (key, tokens, updated_at)
  values (p_key, p_capacity, clock_timestamp())
  on conflict (key) do nothing;

  update rate_limits
     set tokens = least(p_capacity, tokens + extract(epoch from (clock_timestamp() - updated_at)) * p_refill_per_sec) - p_cost,
         updated_at = clock_timestamp()
   where key = p_key
     and least(p_capacity, tokens + extract(epoch from (clock_timestamp() - updated_at)) * p_refill_per_sec) >= p_cost;
  return found;
end;
$$;

-- ------------------------------------------------------------------ signed node requests
-- Harness nodes never hold DB credentials. They call /api/node/* with a request signed by an active enclave
-- key; each (key, nonce) may be used once, which stops replays.
create table node_auth_nonces (
  key        text        not null,
  nonce      text        not null,
  created_at timestamptz not null default now(),
  primary key (key, nonce)
);
create index node_auth_nonces_age on node_auth_nonces (created_at);

create or replace function use_node_nonce(p_key text, p_nonce text)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into node_auth_nonces (key, nonce) values (lower(p_key), p_nonce);
  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function purge_node_nonces(p_older_than interval default interval '1 day')
returns integer
language sql
set search_path = public
as $$
  with d as (delete from node_auth_nonces where created_at < now() - p_older_than returning 1)
  select count(*)::integer from d;
$$;
