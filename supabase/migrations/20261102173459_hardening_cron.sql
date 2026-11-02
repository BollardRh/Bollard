-- Daily purge of idle rate-limit buckets and unregistered hello rows (Supabase only: pg_cron).
select cron.schedule('bollard-purge-stale', '41 3 * * *', $$select public.purge_stale()$$);
