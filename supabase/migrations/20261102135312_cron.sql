-- Scheduled work (doc §8 repeatable jobs), Vercel + Supabase edition: pg_cron fires, pg_net POSTs to the
-- Bollard API on Vercel, and each endpoint processes one bounded batch. Supabase-only.
--
-- Two Vault secrets drive it (set them after the first deploy; see supabase/README.md):
--   api_base_url  e.g. https://<project>.vercel.app  (later https://<your domain>)
--   cron_secret   shared with the Vercel env var CRON_SECRET
-- Until both exist, every job is a no-op.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.call_api(job text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base   text;
  secret text;
begin
  select decrypted_secret into base   from vault.decrypted_secrets where name = 'api_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then
    return null;
  end if;
  return net.http_post(
    url                  := rtrim(base, '/') || '/api/cron/' || job,
    headers              := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', secret),
    body                 := jsonb_build_object('job', job),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function private.call_api(text) from public, anon, authenticated;

-- cron.schedule upserts by name, so re-running this migration is harmless.
select cron.schedule('bollard-indexer',         '* * * * *',    $$select private.call_api('indexer')$$);
select cron.schedule('bollard-coordinator',     '* * * * *',    $$select private.call_api('coordinator')$$);
select cron.schedule('bollard-watch-keys',      '* * * * *',    $$select private.call_api('watch-keys')$$);
select cron.schedule('bollard-keeper-fees',     '*/15 * * * *', $$select private.call_api('keeper-fees')$$);
select cron.schedule('bollard-keeper-disputes', '*/15 * * * *', $$select private.call_api('keeper-disputes')$$);
select cron.schedule('bollard-keeper-refunds',  '0 * * * *',    $$select private.call_api('keeper-refunds')$$);
select cron.schedule('bollard-keeper-revokes',  '*/10 * * * *', $$select private.call_api('keeper-revokes')$$);
select cron.schedule('bollard-alerts',          '*/5 * * * *',  $$select private.call_api('alerts')$$);

-- housekeeping inside the database
select cron.schedule('bollard-purge-nonces', '17 3 * * *', $$select public.purge_node_nonces()$$);
select cron.schedule('bollard-purge-cron-log', '23 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
