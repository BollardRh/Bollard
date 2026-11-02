-- Deny-all for the public Data API. The browser never talks to Supabase: it calls the Bollard API on Vercel,
-- which connects with server credentials. Row level security is on for every table with no policies, and
-- the anon / authenticated roles hold no grants, so a leaked anon key reads and writes nothing.

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    -- not FORCE: the owner role the API connects as must keep working
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Objects created later by migrations start closed too.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
