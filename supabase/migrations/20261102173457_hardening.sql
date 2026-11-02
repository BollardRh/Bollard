-- Launch hardening (Phase 10 security review).

-- Arenas are served only when the house agent row names the arena's agent key and funder, so nobody can open
-- an arena that makes the engine sign transactions for them.
alter table house_agents add column agent_key text, add column funder text;

-- Reassignment: each round seeds a fresh stake-weighted pick, and leads that already stalled are skipped.
alter table run_requests
  add column assign_round integer not null default 0,
  add column stalled_leads text[] not null default '{}';

-- One bundle per lead per request.
create unique index run_bundles_one_per_lead on run_bundles (chain_id, request_id, lead_key);

-- Arena sessions handle one message at a time.
alter table arena_sessions add column busy_until timestamptz;

-- Lease locks so overlapping cron calls of the same job do not run twice.
create table job_locks (
  job          text        primary key,
  locked_until timestamptz not null
);
alter table job_locks enable row level security;
revoke all on table job_locks from anon, authenticated;

create or replace function take_job_lock(p_job text, p_seconds integer)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  insert into job_locks (job, locked_until) values (p_job, clock_timestamp() + make_interval(secs => p_seconds))
  on conflict (job) do update set locked_until = excluded.locked_until
    where job_locks.locked_until < clock_timestamp();
  return found;
end;
$$;
revoke execute on function take_job_lock(text, integer) from public, anon, authenticated;

-- Housekeeping: idle rate-limit buckets and hello rows for keys that never registered on-chain.
create or replace function purge_stale()
returns void
language sql
set search_path = public
as $$
  delete from rate_limits where updated_at < now() - interval '2 days';
  delete from node_registrations n
   where n.last_seen < now() - interval '2 days'
     and not exists (select 1 from enclave_keys k where k.key = n.key);
$$;
revoke execute on function purge_stale() from public, anon, authenticated;

-- New functions are not executable by PUBLIC unless granted (the schema-scoped default could not revoke it).
alter default privileges revoke execute on functions from public;
