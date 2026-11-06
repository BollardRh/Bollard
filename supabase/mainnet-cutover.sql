-- Mainnet cutover (run once, right before the first mainnet deploy goes live).
-- Testnet rows were copied to the testnet_backup schema on 2026-11-06. Every public table is filled again
-- from mainnet by the indexer (corpus and attack cases come from publishCorpus), so all of them are cleared.
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;
